// 손바닥 인식(MediaPipe HandLandmarker, 최대 2개 손) → 손바닥마다 같은 오행 스티커를 그린다. 영상과 좌표는 기기 안에서만 처리된다.
// 손 순서가 바뀌어도 스티커가 서로 바뀌어 붙지 않도록 palm-tracks.js가 위치 기준으로 손을 이어 추적한다.
//
// 실행 경로: Worker를 먼저 쓰고, 실제로 동작하지 않으면 메인 스레드 추론으로 자동 전환한다(브라우저 이름으로 고정하지 않음).
//  · 초기화 실패 / 초기화 시간 초과(INIT_TIMEOUT)
//  · 초기화는 됐지만 첫 추론 응답이 없음 / 응답이 STALL_TIMEOUT 넘게 멈춤
//  · 추론 오류 연속 ERR_LIMIT회
//  · Worker가 받은 프레임이 비어 있음(메인 쪽 밝기는 정상인데 Worker 쪽 밝기 ≈ 0이 BLANK_LIMIT회 연속)
// 진단 옵션(주소 뒤 ?lensHands=main | worker | auto, ?lensDebug=1): main은 메인 스레드 강제, worker는 Worker만(자동 전환 없음).
// 상태는 window.steerLensDiag에 기록되고, lensDebug=1이면 화면 왼쪽 아래에 표시된다.
import {palmPose} from './hand-geometry.mjs';
import {createTracks} from './palm-tracks.js?v=20261117-p1';
// INTERVAL: 추론 간격(ms). Worker는 응답이 올 때까지 다음 프레임을 보내지 않으므로 손 2개로 추론이 길어져도 자동으로 간격이 늘어난다.
// 메인 스레드 대체 경로는 추론이 화면 그리기를 막으므로, 최근 추론 시간의 1.5배(최대 MAIN_MAX)까지 간격을 넓힌다
const N = 512, SCAN = 320, INTERVAL = 100, MAIN_MAX = 180;
const INIT_TIMEOUT = 15000, STALL_TIMEOUT = 3000, ERR_LIMIT = 3, BLANK_LIMIT = 8;
const BASE = new URL('./', import.meta.url).href;
const MODEL = new URL('./vendor/hand_landmarker.task', import.meta.url).href, WASM = new URL('./vendor/wasm', import.meta.url).href;
const OPTIONS = {runningMode:'VIDEO', numHands:2, minHandDetectionConfidence:.6, minHandPresenceConfidence:.6, minTrackingConfidence:.55};

function readParams(){
  try { const q = new URLSearchParams(location.search); const h = (q.get('lensHands') || 'auto').toLowerCase();
    return {force:['main', 'worker'].includes(h) ? h : 'auto', debug:q.get('lensDebug') === '1'}; }
  catch { return {force:'auto', debug:false}; }
}
const lumOf = d => { let s = 0, n = 0; for (let i = 0; i < d.length; i += 64) { s += d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114; n++; } return n ? s / n : 0; };

export function createPalmOverlay(){
  const ink = document.createElement('canvas'); ink.width = ink.height = N; const ictx = ink.getContext('2d');
  const scan = document.createElement('canvas'); scan.width = scan.height = SCAN; const sctx = scan.getContext('2d', {willReadFrequently:true});
  const P = readParams();
  // 진단 기록: 경로 · 초기화 · 프레임 송수신 · 랜드마크 수신과 palmPose 결과를 따로 센다
  const diag = window.steerLensDiag = {
    requested:P.force, workerError:'', mode:'idle', state:'idle', fallbackReason:'', initMs:0, firstResultMs:0,
    sent:0, received:0, errors:0, lastError:'', lastLatency:0, inferMs:0,
    landmarkFrames:0, landmarks21:0, landmarksOther:0, poseOk:0, poseNull:0, lastLandmarks:0, lastPose:null, lastHands:0, twoHandFrames:0, lastPoses:0,
    lumMain:0, lumWorker:null, assets:{}, ua:navigator.userAgent, log:[]
  };
  const note = msg => { const line = Math.round(performance.now()) + 'ms ' + msg; diag.log.push(line); if (diag.log.length > 40) diag.log.shift(); try { console.info('[LuckLens hands]', msg); } catch {} panel(); };

  let worker = null, main = null, ready = false, busy = false, failed = false, last = 0, starting = null;
  const tracks = createTracks();
  let sentAt = 0, firstSentAt = 0, errRun = 0, blankRun = 0, stallTimer = 0, initTimer = 0, gotFirst = false;

  // hands: 감지된 손 수 · n: 첫 손의 랜드마크 수 · poses: 손바닥으로 판정된 손들
  function record(hands, n, poses, now){
    const p = poses[0] || null;
    diag.received++; diag.lastLandmarks = n; diag.lastHands = hands; diag.lastPoses = poses.length; if (hands >= 2) diag.twoHandFrames++;
    diag.lastPose = p ? {x:+p.x.toFixed(3), y:+p.y.toFixed(3), size:+p.size.toFixed(3)} : null;
    if (n > 0) { diag.landmarkFrames++; if (n === 21) diag.landmarks21++; else diag.landmarksOther++; if (p) diag.poseOk++; else diag.poseNull++; }
    if (!gotFirst) { gotFirst = true; diag.firstResultMs = Math.max(1, Math.round(performance.now() - firstSentAt)); note('첫 추론 결과 수신(' + diag.mode + ', ' + diag.firstResultMs + 'ms)'); }
    tracks.update(poses, now);
  }

  async function startMain(reason){
    if (main || failed) return;
    diag.mode = 'main'; diag.state = 'loading'; if (reason) { diag.fallbackReason = reason; note('메인 스레드로 전환: ' + reason); }
    ready = false; busy = false; gotFirst = false; firstSentAt = 0;
    const t0 = performance.now();
    try {
      const {HandLandmarker} = await import('./vendor/vision_bundle.mjs');
      // 메인 스레드에서는 MediaPipe가 WASM 로더를 일반 <script>로 넣는데, 보관 중인 로더는 ES 모듈(import.meta 사용)이라 실패한다.
      // 로더를 직접 모듈로 불러 globalThis.ModuleFactory를 세운 뒤, 로더 경로 없이 WASM 경로만 넘긴다
      if (!globalThis.ModuleFactory) await import(WASM + '/vision_wasm_module_internal.js');
      const files = {wasmBinaryPath:WASM + '/vision_wasm_module_internal.wasm'};
      main = await HandLandmarker.createFromOptions(files, {canvas:document.createElement('canvas'), baseOptions:{modelAssetPath:MODEL, delegate:'CPU'}, ...OPTIONS});
      ready = true; diag.state = 'ready'; diag.initMs = Math.round(performance.now() - t0); note('메인 스레드 초기화 완료(' + diag.initMs + 'ms)');
    } catch (error) { failed = true; diag.state = 'failed'; diag.lastError = String(error && error.message || error); note('메인 스레드 초기화 실패: ' + diag.lastError); checkAssets(); }
  }
  function dropWorker(reason){
    clearTimeout(stallTimer); clearTimeout(initTimer);
    if (worker) { try { worker.terminate(); } catch {} worker = null; }
    if (P.force === 'worker') { failed = true; diag.state = 'failed'; diag.fallbackReason = reason; note('Worker 실패(자동 전환 꺼짐): ' + reason); return Promise.resolve(); }
    return startMain(reason);
  }
  function startWorker(){
    return new Promise(resolve => {
      diag.mode = 'worker'; diag.state = 'loading'; const t0 = performance.now();
      const fail = reason => { if (!worker) return; dropWorker(reason).then(resolve); };
      try { worker = new Worker(new URL('./hand-worker.js', import.meta.url), {type:'module'}); }
      catch (error) { worker = {terminate(){}}; fail('Worker 생성 실패: ' + (error && error.message || error)); return; }
      initTimer = setTimeout(() => fail('Worker 초기화 시간 초과(' + INIT_TIMEOUT / 1000 + '초)'), INIT_TIMEOUT);
      worker.onmessage = ({data}) => {
        if (data.type === 'ready') { clearTimeout(initTimer); ready = true; diag.state = 'ready'; diag.initMs = data.ms || Math.round(performance.now() - t0); note('Worker 초기화 완료(' + diag.initMs + 'ms)'); resolve(); }
        else if (data.type === 'pose') {
          busy = false; clearTimeout(stallTimer); errRun = 0; const now = performance.now();
          diag.lastLatency = Math.round(now - sentAt); diag.inferMs = data.ms; diag.lumWorker = Math.round(data.lum);
          // Worker가 빈 프레임을 받는지: 메인 쪽은 밝은데 Worker 쪽은 0에 가까우면 전달 경로 문제
          blankRun = data.lum < 1 && diag.lumMain > 10 ? blankRun + 1 : 0;
          if (blankRun >= BLANK_LIMIT) { fail('Worker가 빈 프레임을 받음'); return; }
          record(data.hands || 0, data.n, data.poses || [], now);
        } else if (data.type === 'error') {
          diag.errors++; diag.lastError = data.stage + ': ' + data.message;
          if (data.stage === 'init') { clearTimeout(initTimer); diag.workerError = data.message; note('Worker 초기화 오류: ' + data.message); checkAssets(); fail('Worker 초기화 오류'); return; }
          busy = false; clearTimeout(stallTimer); errRun++; note('Worker 추론 오류(' + errRun + '): ' + data.message);
          if (errRun >= ERR_LIMIT) fail('Worker 추론 오류 ' + ERR_LIMIT + '회 연속');
        }
      };
      worker.onerror = e => { diag.errors++; diag.lastError = 'worker: ' + (e && e.message || 'error'); if (e && e.preventDefault) e.preventDefault(); fail('Worker 오류 이벤트: ' + (e && e.message || '알 수 없음')); };
      worker.onmessageerror = () => fail('Worker 메시지 직렬화 오류');
      worker.postMessage({type:'init'});
      note('Worker 시작');
    });
  }
  function start(){
    if (starting) return starting;
    note('요청 경로: ' + P.force + (P.debug ? ' · 진단 표시' : ''));
    if (P.debug) checkAssets();
    starting = (P.force === 'main' ? startMain('진단 옵션으로 메인 스레드 강제') : startWorker());
    return starting;
  }
  // 이번 프레임에 손 인식용 프레임이 필요한지(추론 간격이 됐고 이전 추론이 끝났는지) — 필요할 때만 512 프레임을 그리기 위함
  const scanDue = now => ready && !failed && !busy && now - last >= (main && !worker ? Math.min(MAIN_MAX, Math.max(INTERVAL, diag.inferMs * 1.5)) : INTERVAL);
  // source: 좌우 반전 · 정사각 크롭된 512 프레임
  function scanHands(source, now){
    if (!ready || failed || busy || now - last < (main && !worker ? Math.min(MAIN_MAX, Math.max(INTERVAL, diag.inferMs * 1.5)) : INTERVAL)) return;
    last = now; sctx.drawImage(source, 0, 0, SCAN, SCAN);
    if (worker) {
      let img; try { img = sctx.getImageData(0, 0, SCAN, SCAN); } catch (error) { diag.lastError = 'getImageData: ' + error; return; }
      diag.lumMain = Math.round(lumOf(img.data));
      busy = true; sentAt = now; if (!firstSentAt) firstSentAt = now; diag.sent++;
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => { if (worker && busy) dropWorker(gotFirst ? 'Worker 응답 중단(' + STALL_TIMEOUT / 1000 + '초)' : 'Worker 첫 추론 응답 없음(' + STALL_TIMEOUT / 1000 + '초)'); }, STALL_TIMEOUT);
      try { worker.postMessage({type:'frame', buffer:img.data.buffer, width:SCAN, height:SCAN, time:now}, [img.data.buffer]); }
      catch (error) { busy = false; clearTimeout(stallTimer); dropWorker('프레임 전송 실패: ' + (error && error.message || error)); }
    } else if (main) {
      if (!firstSentAt) firstSentAt = now; diag.sent++;
      const t0 = performance.now();
      try { const r = main.detectForVideo(scan, now); const all = r.landmarks || []; diag.inferMs = Math.round(performance.now() - t0); errRun = 0; record(all.length, all[0] ? all[0].length : 0, all.map(palmPose).filter(Boolean), now); }
      catch (error) { diag.errors++; errRun++; diag.lastError = 'main: ' + (error && error.message || error); if (errRun === 1 || errRun % 20 === 0) note('메인 스레드 추론 오류: ' + diag.lastError); }
    }
    if (P.debug && diag.sent % 5 === 0) panel();
  }
  // 손바닥마다 같은 스티커를 부드럽게 따라 그린다(손별 크기 · 각도 유지). 반환: 안내 문구 상태
  // inkDirty: 이번 호출에서 스티커 캔버스가 바뀌었는지. 손이 없고 이미 비어 있으면 지우지도 다시 올리지도 않는다(WebGL 텍스처 업로드 절약)
  let inkEmpty = true, inkDirty = true;
  function paintPalm(sticker, now){
    const list = tracks.step(now), ok = sticker && sticker.complete && sticker.naturalWidth;
    if (!ok || !list.length) { inkDirty = !inkEmpty; if (!inkEmpty) { ictx.clearRect(0, 0, N, N); inkEmpty = true; } return failed ? 'unavailable' : !ready ? 'loading' : tracks.active(now) ? 'found' : 'searching'; }
    ictx.clearRect(0, 0, N, N); inkEmpty = false; inkDirty = true;
    for (const t of list) {
      const w = t.size * N * 2.1, h = w * sticker.naturalHeight / sticker.naturalWidth;
      ictx.save(); ictx.globalAlpha = Math.max(0, Math.min(1, t.a)); ictx.translate(t.x * N, t.y * N); ictx.rotate(t.rotation); ictx.drawImage(sticker, -w / 2, -h / 2, w, h); ictx.restore();
    }
    return failed ? 'unavailable' : !ready ? 'loading' : tracks.active(now) ? 'found' : 'searching';
  }
  function clear(){ ictx.clearRect(0, 0, N, N); tracks.reset(); inkEmpty = true; inkDirty = true; }
  const inkChanged = () => inkDirty;

  // 모델 · WASM 파일 응답 확인(진단 표시가 켜졌거나 초기화가 실패했을 때만): 상태 코드 · 크기 · 캐시 헤더
  let assetsChecked = false;
  function checkAssets(){
    if (assetsChecked) return; assetsChecked = true;
    const files = {model:MODEL, wasm:WASM + '/vision_wasm_module_internal.wasm', loader:WASM + '/vision_wasm_module_internal.js', bundle:BASE + 'vendor/vision_bundle.mjs', worker:BASE + 'hand-worker.js'};
    Object.entries(files).forEach(([k, url]) => fetch(url, {method:'HEAD', cache:'no-store'})
      .then(r => { diag.assets[k] = r.status + ' · ' + (r.headers.get('content-length') || '?') + 'B · ' + (r.headers.get('content-type') || '?') + ' · ' + (r.headers.get('cache-control') || '-'); note('파일 ' + k + ': ' + diag.assets[k]); })
      .catch(error => { diag.assets[k] = '오류 ' + (error && error.message || error); note('파일 ' + k + ' 확인 실패: ' + diag.assets[k]); }));
  }
  let box = null;
  function panel(){
    if (!P.debug) return;
    if (!box) { box = document.createElement('pre'); Object.assign(box.style, {position:'fixed', left:'8px', bottom:'8px', zIndex:99999, maxWidth:'560px', maxHeight:'46vh', overflow:'auto', margin:0, padding:'10px 12px', background:'rgba(0,0,0,.82)', color:'#9f9', font:'11px/1.45 ui-monospace,Menlo,monospace', whiteSpace:'pre-wrap', pointerEvents:'auto', borderRadius:'8px'}); document.body.appendChild(box); }
    const d = diag;
    box.textContent = 'Luck Lens 손 인식 진단\n' +
      'requested ' + d.requested + ' · mode ' + d.mode + ' · state ' + d.state + (d.fallbackReason ? '\nfallback ' + d.fallbackReason : '') +
      '\ninit ' + d.initMs + 'ms · first ' + (d.firstResultMs || '-') + 'ms · sent ' + d.sent + ' · recv ' + d.received + ' · latency ' + d.lastLatency + 'ms · infer ' + d.inferMs + 'ms' +
      '\nlandmarks: frames ' + d.landmarkFrames + ' (21개 ' + d.landmarks21 + ' / 기타 ' + d.landmarksOther + ') · last ' + d.lastLandmarks +
      '\nhands: last ' + d.lastHands + ' (손바닥 ' + d.lastPoses + ') · 2손 프레임 ' + d.twoHandFrames + ' · 추적 ' + tracks.list.length +
      '\npalmPose: ok ' + d.poseOk + ' / null ' + d.poseNull + ' · last ' + JSON.stringify(d.lastPose) +
      (d.workerError ? '\nworker error ' + d.workerError : '') + '\nlum main ' + d.lumMain + ' / worker ' + d.lumWorker + ' · errors ' + d.errors + (d.lastError ? ' · ' + d.lastError : '') +
      '\nassets ' + JSON.stringify(d.assets) + '\n' + d.ua + '\n---\n' + d.log.slice(-12).join('\n');
  }
  return {ink, start, scanHands, scanDue, paintPalm, clear, inkChanged};
}
