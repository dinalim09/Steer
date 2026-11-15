// 손바닥 인식(MediaPipe HandLandmarker) → 손바닥 위에 오행 스티커를 그린다. 영상과 좌표는 기기 안에서만 처리된다.
import {palmPose} from './hand-geometry.mjs';
const N = 512, SCAN = 320, INTERVAL = 100;
export function createPalmOverlay(){
  const ink = document.createElement('canvas'); ink.width = ink.height = N; const ictx = ink.getContext('2d');
  const scan = document.createElement('canvas'); scan.width = scan.height = SCAN; const sctx = scan.getContext('2d', {willReadFrequently:true});
  let worker = null, main = null, ready = false, busy = false, failed = false, last = 0, pose = null, shown = null, seen = 0, starting = null;
  async function startMain(){
    const {FilesetResolver, HandLandmarker} = await import('./vendor/vision_bundle.mjs');
    const files = await FilesetResolver.forVisionTasks(new URL('./vendor/wasm', import.meta.url).href, true);
    main = await HandLandmarker.createFromOptions(files, {baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task', import.meta.url).href, delegate:'CPU'}, runningMode:'VIDEO', numHands:1, minHandDetectionConfidence:.6, minHandPresenceConfidence:.6, minTrackingConfidence:.55});
    ready = true;
  }
  function start(){
    if (starting) return starting;
    starting = new Promise(resolve => {
      const fallback = () => { if (worker) { worker.terminate(); worker = null; } startMain().then(resolve, () => { failed = true; resolve(); }); };
      try {
        worker = new Worker(new URL('./hand-worker.js', import.meta.url), {type:'module'});
        const timer = setTimeout(fallback, 15000);
        worker.onmessage = ({data}) => {
          if (data.type === 'ready') { clearTimeout(timer); ready = true; resolve(); }
          else if (data.type === 'pose') { busy = false; pose = data.pose; if (pose) seen = performance.now(); }
          else if (data.type === 'error') { clearTimeout(timer); busy = false; if (!ready) fallback(); }
        };
        worker.onerror = () => { clearTimeout(timer); if (!ready) fallback(); };
        worker.postMessage({type:'init'});
      } catch { fallback(); }
    });
    return starting;
  }
  // source: 좌우 반전 · 정사각 크롭된 512 프레임
  function scanHands(source, now){
    if (!ready || failed || busy || now - last < INTERVAL) return;
    last = now; sctx.drawImage(source, 0, 0, SCAN, SCAN);
    if (worker) { busy = true; createImageBitmap(scan).then(image => worker.postMessage({type:'frame', image, time:now}, [image]), () => { busy = false; }); }
    else if (main) { try { const r = main.detectForVideo(scan, now); pose = palmPose(r.landmarks[0]); if (pose) seen = now; } catch {} }
  }
  // 스티커를 손바닥 위치에 부드럽게 따라 그린다. 반환: 안내 문구 상태
  function paintPalm(sticker, now){
    ictx.clearRect(0, 0, N, N);
    const target = pose && now - seen < 400 ? pose : null;
    if (target) shown = shown ? {x:shown.x + (target.x - shown.x) * .45, y:shown.y + (target.y - shown.y) * .45, size:shown.size + (target.size - shown.size) * .35, rotation:shown.rotation + (target.rotation - shown.rotation) * .35, a:Math.min(1, shown.a + .25)} : {...target, a:.25};
    else if (shown) { shown.a -= .2; if (shown.a <= 0) shown = null; }
    if (shown && sticker && sticker.complete && sticker.naturalWidth) {
      const w = shown.size * N * 2.1, h = w * sticker.naturalHeight / sticker.naturalWidth;
      ictx.save(); ictx.globalAlpha = Math.max(0, shown.a); ictx.translate(shown.x * N, shown.y * N); ictx.rotate(shown.rotation); ictx.drawImage(sticker, -w / 2, -h / 2, w, h); ictx.restore();
    }
    return failed ? 'unavailable' : !ready ? 'loading' : target ? 'found' : 'searching';
  }
  function clear(){ ictx.clearRect(0, 0, N, N); pose = shown = null; }
  return {ink, start, scanHands, paintPalm, clear};
}
