// STEER Camera — Luck Lens 오행 포토부스. 카메라 영상 · 손 위치 · 촬영 사진은 기기 안에서 처리되며 서버로 전송되지 않는다.
import {createFisheye} from './fisheye.js';
import {createFilterPreviews} from './filter-previews.js';
import {createPalmOverlay} from './palm-overlay.js';
import {GLYPHS} from './glyphs.js';

const BASE = new URL('./', import.meta.url).href;
const N = 512, STRENGTH = .65, FADE = 380;
const COLORS = ['#c2ff0a', '#ff8778', '#ffcc45', '#baa7ef', '#87dff4'], HELM = '#ff8778';
const KEYS = ['wood', 'fire', 'earth', 'metal', 'water'], NAMES = ['木 나무', '火 불', '土 흙', '金 쇠', '水 물'];
const keyOf = e => e < 0 ? 'helm' : KEYS[e];
const HINT = {sample:'카메라를 켜면 손바닥에 오행 스티커가 나타나요', loading:'손 인식을 준비하고 있어요', searching:'카메라에 손바닥을 펴보세요!', found:'오늘의 기운을 손바닥에 담아보세요!', unavailable:'카메라에 손바닥을 펴보세요!'};

const CSS = `
.llz{position:absolute;inset:0;background:#0A0A0A;color:#fff;font-family:Pretendard,'Noto Sans KR',system-ui,sans-serif;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;--accent:${HELM}}
.llz button,.llz a{font:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.llz .ll-lens{position:absolute;left:394px;top:100px;width:580px;height:580px;box-sizing:border-box;border:11.354px solid var(--accent);border-radius:50%;overflow:hidden;background:#141414;box-shadow:0 22px 50.6px rgba(0,0,0,.25);transition:border-color .38s ease}
.llz .ll-lens canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block}
.llz .ll-sticker{position:absolute;left:837.9px;top:261.1px;height:148px;transform:translate(-50%,-50%) rotate(12deg);pointer-events:none;transition:opacity .25s ease}
.llz .ll-sticker img{height:100%;width:auto;display:block}
.llz:not(.sample) .ll-sticker,.llz.result .ll-sticker{opacity:0}
.llz .ll-mode{position:absolute;left:684px;top:628px;transform:translateX(-50%);height:44px;padding:0 20px;border:0;border-radius:22px;background:rgba(10,10,10,.72);color:#fff;font-size:16px;font-weight:500;cursor:pointer;white-space:nowrap;transition:transform .15s ease,opacity .2s}
.llz .ll-mode.press{transform:translateX(-50%) scale(.96)}
.llz .ll-hint{position:absolute;left:684px;top:697px;transform:translateX(-50%);height:56px;padding:0 20px;box-sizing:border-box;border-radius:500px;background:rgba(255,255,255,.1);font-size:24px;font-weight:500;line-height:56px;letter-spacing:-.01em;white-space:nowrap}
.llz .ll-notice{position:absolute;left:684px;top:697px;transform:translateX(-50%);max-width:880px;min-height:56px;padding:14px 24px;box-sizing:border-box;border-radius:28px;background:rgba(255,135,120,.16);color:#fff;font-size:18px;line-height:28px;text-align:center;display:none}
.llz.noticed .ll-notice{display:block}.llz.noticed .ll-hint{display:none}
.llz .ll-strip{position:absolute;left:0;top:790px;width:1366px;height:209px;transition:opacity .25s ease}
.llz .ll-f{position:absolute;top:0;width:207.052px;height:208.646px;padding:0;border:0;background:none;cursor:pointer;transition:transform .15s ease}
.llz .ll-f.press{transform:scale(.96)}
.llz .ll-f .ll-th,.llz .ll-f canvas{position:absolute;left:0;top:0;width:206.959px;height:171.388px;display:block;object-fit:cover}
.llz .ll-f canvas{opacity:0;transition:opacity .2s}.llz .ll-f canvas.on{opacity:1}
.llz .ll-cap{position:absolute;left:0;top:171px;width:207.052px;height:37.646px;background:#f2f2f2;transition:background-color .25s ease}
.llz .ll-cap svg{position:absolute;fill:#0A0A0A}
.llz .ll-f[aria-pressed=true] .ll-cap{background:var(--accent)}
.llz .ll-shutter{position:absolute;left:609px;top:820px;width:148px;height:148px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;color:var(--accent);transition:transform .15s ease,opacity .25s ease}
.llz .ll-shutter.press{transform:scale(.96)}.llz .ll-shutter svg{display:block}
.llz .ll-shutter:disabled{cursor:default}
.llz .ll-count{position:absolute;left:405.354px;top:111.354px;width:557.292px;height:557.292px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:160px;font-weight:700;color:#fff;text-shadow:0 4px 24px rgba(0,0,0,.35);pointer-events:none;opacity:0}
.llz .ll-count.on{animation:llCount 1s ease both}
@keyframes llCount{0%{opacity:0;transform:scale(1.25)}20%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(.92)}}
.llz .ll-flash{position:absolute;left:405.354px;top:111.354px;width:557.292px;height:557.292px;border-radius:50%;background:#fff;opacity:0;pointer-events:none}
.llz .ll-flash.on{animation:llFlash .5s ease-out both}
@keyframes llFlash{0%{opacity:.9}100%{opacity:0}}
.llz .ll-actions{position:absolute;left:684px;top:790px;transform:translateX(-50%);display:none;gap:16px}
.llz .ll-actions button,.llz .ll-actions a{display:inline-flex;align-items:center;justify-content:center;min-width:180px;height:64px;padding:0 28px;box-sizing:border-box;border-radius:32px;border:0;font-size:22px;font-weight:600;text-decoration:none;cursor:pointer;transition:transform .15s ease}
.llz .ll-actions .press{transform:scale(.96)}
.llz .ll-retake{background:rgba(255,255,255,.12);color:#fff}
.llz .ll-save{background:var(--accent);color:#0A0A0A}
.llz.result .ll-actions{display:flex}
.llz.result .ll-strip,.llz.result .ll-shutter,.llz.result .ll-mode,.llz.result .ll-hint{opacity:0;pointer-events:none}
.llz.busy .ll-strip,.llz.busy .ll-mode{pointer-events:none}
.llz .ll-video{position:absolute;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none}
.llz .ll-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.llz .ll-count.on{animation-duration:.01s}.llz .ll-flash.on{animation:none}}
`;

const COL = [23, 236.915, 453.874, 698, 914.959, 1131.918];
function capSVG(e){
  if (e < 0) return `<svg viewBox="0 0 27.347 23.042" width="27.347" height="23.042" style="left:87.69px;top:11.09px" aria-hidden="true"><path d="${GLYPHS.helm}"/></svg>`;
  return `<svg viewBox="0 0 23 30" width="23" height="30" style="left:92.13px;top:3.97px" aria-hidden="true"><path d="${GLYPHS[e]}"/></svg>`;
}
const SHUTTER = `<svg viewBox="0 0 148 148" width="148" height="148" aria-hidden="true"><circle cx="74" cy="74" r="74" fill="#0A0A0A"/><g transform="translate(38.121 38.11)" fill="currentColor"><rect x="4.764" y="17.106" width="63.909" height="50.455" rx="8.97"/><path d="M25.737 4.773H46.279L51.414 21.03H19.46Z"/><path d="M36.1578 0C38.237 0 39.953-.002 41.3659.118C42.8214.242 44.1373.507 45.4059 1.135C47.6657 2.254 49.0943 4.032 50.0973 5.815C51.0583 7.524 51.7541 9.494 52.3385 10.955L53.3385 13.457C57.1308 13.472 59.8506 13.561 62.1979 14.546C65.3857 15.884 67.974 18.352 69.483 21.477C70.1563 22.871 70.4993 24.37 70.7262 26.109C70.9499 27.825 71.0788 29.946 71.2428 32.606L71.7643 41.051C72.1731 47.679 72.5012 52.908 72.2008 56.999C71.8953 61.159 70.9188 64.553 68.403 67.267C65.8822 69.986 62.5867 71.192 58.4918 71.763C54.4729 72.323 49.2954 72.316 42.7448 72.316H29.5719C23.0214 72.316 17.8437 72.323 13.8248 71.763C9.73 71.192 6.4345 69.986 3.9137 67.267C1.3979 64.553.4224 61.159.1168 56.999C-.1836 52.908.1436 47.679.5524 41.051L1.0739 32.606C1.2379 29.946 1.3668 27.825 1.5905 26.109C1.8174 24.37 2.1603 22.871 2.8336 21.477C4.3427 18.351 6.9308 15.884 10.1188 14.546C12.4656 13.561 15.1842 13.472 18.9752 13.457L19.9772 10.955C20.5616 9.494 21.2564 7.524 22.2174 5.815C23.2205 4.032 24.6498 2.254 26.9098 1.135C28.1783.507 29.4935.242 30.9489.118C32.3618-.002 34.0784 0 36.1578 0Z"/><circle cx="36.158" cy="43.12" r="11.773" fill="#0A0A0A"/></g></svg>`;

export function createLens(root, hooks = {}){
  if (!document.getElementById('llz-css')) { const st = document.createElement('style'); st.id = 'llz-css'; st.textContent = CSS; document.head.appendChild(st); }
  root.classList.add('llz', 'sample');
  root.innerHTML = `
    <div class="ll-lens"><canvas class="ll-out" width="${N}" height="${N}" role="img" aria-label="Luck Lens 미리보기"></canvas></div>
    <div class="ll-sticker"><img alt="" src="${BASE}st-helm.webp"></div>
    <div class="ll-count" aria-live="assertive"></div><div class="ll-flash"></div>
    <button class="ll-mode" type="button">카메라 켜기</button>
    <div class="ll-hint" aria-live="polite">${HINT.sample}</div>
    <div class="ll-notice" role="alert"></div>
    <div class="ll-strip" role="group" aria-label="오행 필터">
      ${[-1, 0, 1, 2, 3, 4].map((e, i) => `<button class="ll-f" type="button" data-element="${e}" aria-pressed="${e < 0}" aria-label="${e < 0 ? '기본(helm)' : NAMES[e]} 필터" style="left:${COL[i]}px"><img class="ll-th" alt="" src="${BASE}th-${keyOf(e)}.webp"><canvas class="filter-preview"></canvas><span class="ll-cap">${capSVG(e)}</span></button>`).join('')}
    </div>
    <button class="ll-shutter" type="button" aria-label="3초 뒤 촬영">${SHUTTER}</button>
    <div class="ll-actions"><button class="ll-retake" type="button">다시 찍기</button><a class="ll-save" download="Steer-Luck-Lens.png" href="#">사진 저장</a></div>
    <p class="ll-sr">카메라 영상·손 위치·촬영 사진은 기기 안에서 처리되며 서버로 전송되지 않습니다.</p>
    <video class="ll-video" autoplay playsinline muted></video>`;
  const $ = s => root.querySelector(s);
  const video = $('.ll-video'), out = $('.ll-out'), hint = $('.ll-hint'), notice = $('.ll-notice'), mode = $('.ll-mode'), shutter = $('.ll-shutter');
  const count = $('.ll-count'), flash = $('.ll-flash'), stickerImg = $('.ll-sticker img'), save = $('.ll-save'), buttons = [...root.querySelectorAll('.ll-f')];
  const renderer = createFisheye(out), previews = createFilterPreviews(buttons), palm = createPalmOverlay();
  const frame = document.createElement('canvas'); frame.width = frame.height = N; const fctx = frame.getContext('2d', {willReadFrequently:renderer.type !== 'webgl'});
  const stickers = {}; for (const k of ['helm', ...KEYS]) { const im = new Image(); im.decoding = 'async'; im.src = `${BASE}st-${k}.webp`; stickers[k] = im; }
  const ref = new Image(); ref.decoding = 'async'; ref.src = `${BASE}ref.webp`;
  const settings = {strength:STRENGTH, element:-1, from:-1, t:1, amount:1};
  let stream = null, request = 0, live = false, active = false, raf = 0, fadeStart = 0, lastPreview = 0, hintState = '', result = false, busy = false, saveURL = '', timers = [], resumeLive = false;

  const emit = (type, extra = {}) => { try { hooks.event && hooks.event(type, {element:keyOf(settings.element), ...extra}); } catch {} };
  const setHint = k => { if (hintState !== k) { hintState = k; hint.textContent = HINT[k]; } };
  const showNotice = text => { notice.textContent = text; root.classList.toggle('noticed', !!text); };

  function choose(e, quiet){
    if (busy || result) return;
    if (e === settings.element) return;
    settings.from = settings.element; settings.element = e; settings.t = 0; fadeStart = performance.now();
    root.style.setProperty('--accent', e < 0 ? HELM : COLORS[e]);
    buttons.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.element) === e)));
    stickerImg.src = `${BASE}st-${keyOf(e)}.webp`;
    if (!quiet) emit('filter');
  }
  buttons.forEach(b => b.addEventListener('click', () => choose(Number(b.dataset.element))));

  // 정사각 중앙 크롭 + 좌우 반전(거울)
  function drawVideo(){
    const vw = video.videoWidth, vh = video.videoHeight; if (!vw || !vh) return false;
    const s = Math.min(vw, vh); fctx.save(); fctx.setTransform(-1, 0, 0, 1, N, 0); fctx.drawImage(video, (vw - s) / 2, (vh - s) / 2, s, s, 0, 0, N, N); fctx.restore(); return true;
  }
  // 샘플: Figma 원본 렌즈 사진(이미 어안 처리됨)의 원 안쪽 영역
  function drawSample(){
    if (!ref.complete || !ref.naturalWidth) return false;
    const k = ref.naturalWidth / 631, d = 558 * k; fctx.drawImage(ref, 315.3 * k - d / 2, 293.3 * k - d / 2, d, d, 0, 0, N, N); return true;
  }
  function tick(now){
    raf = 0; if (!active || result) return;
    if (settings.t < 1) { const x = Math.min(1, (now - fadeStart) / FADE); settings.t = x * x * (3 - 2 * x); if (x >= 1) { settings.t = 1; settings.from = settings.element; } }
    if (live && drawVideo()) {
      palm.scanHands(frame, now); const st = palm.paintPalm(stickers[keyOf(settings.element)], now);
      setHint(st); renderer.render(frame, palm.ink, settings);
      if (now - lastPreview > 180) { lastPreview = now; previews.render(frame, true); buttons.forEach(b => b.querySelector('canvas').classList.add('on')); }
    } else if (!live && drawSample()) {
      palm.clear(); renderer.render(frame, palm.ink, {...settings, strength:0});
      if (!lastPreview) { lastPreview = now; previews.render(frame, false); buttons.forEach(b => b.querySelector('canvas').classList.add('on')); }
    }
    raf = requestAnimationFrame(tick);
  }
  const loop = () => { if (!raf && active) raf = requestAnimationFrame(tick); };

  function stopCamera(){
    request++;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; emit('camera_stop'); }
    video.pause(); video.srcObject = null; live = false; palm.clear();
  }
  function toSample(){ stopCamera(); root.classList.add('sample'); mode.textContent = '카메라 켜기'; lastPreview = 0; setHint('sample'); }
  async function openCamera(){
    const token = ++request; showNotice('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) { toSample(); showNotice('이 브라우저에서는 카메라를 사용할 수 없습니다. Safari 최신 버전에서 다시 시도해 주세요.'); emit('camera_error', {reason:'unsupported'}); return; }
    mode.disabled = true; mode.textContent = '카메라 연결 중…';
    try {
      const s = await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:{ideal:'user'}, width:{ideal:1280}, height:{ideal:720}}});
      if (token !== request || !active) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s; video.srcObject = s; try { await video.play(); } catch {}
      live = true; root.classList.remove('sample'); mode.textContent = '샘플 미리보기'; lastPreview = 0; setHint('loading');
      palm.start(); emit('camera_start');
    } catch (err) {
      if (token !== request) return;
      toSample();
      const n = err && err.name;
      showNotice(n === 'NotAllowedError' || n === 'SecurityError' ? '카메라 권한이 허용되지 않았습니다. 설정 › Safari › 카메라에서 허용한 뒤 ‘카메라 켜기’를 눌러 주세요. 지금은 샘플 사진으로 필터를 미리 볼 수 있습니다.'
        : n === 'NotFoundError' || n === 'OverconstrainedError' ? '사용할 수 있는 카메라를 찾지 못했습니다. 샘플 사진으로 필터를 미리 볼 수 있습니다.'
        : n === 'NotReadableError' ? '다른 앱이 카메라를 사용 중입니다. 다른 앱을 닫은 뒤 ‘카메라 켜기’를 눌러 주세요.'
        : '카메라를 시작하지 못했습니다. ‘카메라 켜기’를 눌러 다시 시도해 주세요.');
      emit('camera_denied', {reason:n || 'error'});
    } finally { if (token === request) mode.disabled = false; }
  }
  mode.addEventListener('click', () => { if (busy || result) return; if (live) { toSample(); emit('sample_mode'); } else openCamera(); });

  function clearTimers(){ timers.forEach(clearTimeout); timers = []; }
  function capture(){
    if (busy || result || !active) return;
    busy = true; root.classList.add('busy'); shutter.disabled = true; emit('capture_start');
    let n = 3; const step = () => {
      if (!active) return;
      if (n > 0) { count.textContent = n; count.classList.remove('on'); void count.offsetWidth; count.classList.add('on'); n--; timers.push(setTimeout(step, 1000)); }
      else finish();
    };
    step();
  }
  function finish(){
    count.classList.remove('on'); count.textContent = '';
    // 프리뷰와 같은 렌더러 출력 그대로 사용 → 촬영 결과 색감이 미리보기와 동일
    if (settings.t < 1) { settings.t = 1; settings.from = settings.element; }
    if (live && drawVideo()) { palm.paintPalm(stickers[keyOf(settings.element)], performance.now()); renderer.render(frame, palm.ink, settings); }
    else if (drawSample()) renderer.render(frame, palm.ink, {...settings, strength:0});
    const shot = document.createElement('canvas'); shot.width = shot.height = 900; const c = shot.getContext('2d');
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || HELM;
    c.fillStyle = '#0A0A0A'; c.fillRect(0, 0, 900, 900);
    c.save(); c.beginPath(); c.arc(450, 440, 400, 0, Math.PI * 2); c.clip(); c.drawImage(renderer.canvas, 50, 40, 800, 800); c.restore();
    c.lineWidth = 12; c.strokeStyle = accent; c.beginPath(); c.arc(450, 440, 400, 0, Math.PI * 2); c.stroke();
    if (!live) {
      const im = stickers[keyOf(settings.element)];
      if (im.complete && im.naturalWidth) { const h = 148 * 800 / 558, w = h * im.naturalWidth / im.naturalHeight; c.save(); c.translate(50 + (837.9 - 405.354) * 800 / 558, 40 + (261.1 - 111.354) * 800 / 558); c.rotate(12 * Math.PI / 180); c.drawImage(im, -w / 2, -h / 2, w, h); c.restore(); }
      c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '600 18px Pretendard, "Noto Sans KR", sans-serif'; c.textAlign = 'center'; c.fillText('STEER · SAMPLE PREVIEW', 450, 878);
    }
    result = true; busy = false; root.classList.remove('busy'); root.classList.add('result'); shutter.disabled = false;
    flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    save.removeAttribute('href');
    shot.toBlob(b => { if (!b || !result) return; if (saveURL) URL.revokeObjectURL(saveURL); saveURL = URL.createObjectURL(b); save.href = saveURL; }, 'image/png');
    emit('capture', {mode:live ? 'camera' : 'sample'});
  }
  function retake(){
    if (!result) return; result = false; root.classList.remove('result'); save.removeAttribute('href');
    if (saveURL) { URL.revokeObjectURL(saveURL); saveURL = ''; } loop();
  }
  shutter.addEventListener('click', capture);
  $('.ll-retake').addEventListener('click', () => { retake(); emit('retake'); });
  save.addEventListener('click', ev => { if (!save.getAttribute('href')) { ev.preventDefault(); return; } emit('save'); });
  const onKey = ev => { if (active && ev.key === 'Escape' && result) retake(); };
  const onVis = () => { if (!active) return; if (document.hidden) { resumeLive = live; stopCamera(); } else if (resumeLive) { resumeLive = false; openCamera(); } };
  document.addEventListener('keydown', onKey); document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', () => stopCamera());

  // 터치 피드백(0.96, 0.15s) — 호버 없음
  root.addEventListener('pointerdown', ev => { const b = ev.target.closest('.ll-f,.ll-shutter,.ll-mode,.ll-actions button,.ll-actions a'); if (!b || b.disabled) return; b.classList.add('press'); const up = () => { b.classList.remove('press'); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true); }; window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true); });

  return {
    open(){ if (active) return; active = true; showNotice(''); setHint('sample'); loop(); openCamera(); },
    close(){
      if (!active) return; active = false; clearTimers(); stopCamera(); resumeLive = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      busy = false; result = false; root.classList.remove('busy', 'result', 'noticed'); root.classList.add('sample'); shutter.disabled = false; mode.disabled = false; mode.textContent = '카메라 켜기';
      count.classList.remove('on'); count.textContent = ''; if (saveURL) { URL.revokeObjectURL(saveURL); saveURL = ''; } save.removeAttribute('href');
      settings.element = settings.from = -1; settings.t = 1; root.style.setProperty('--accent', HELM); buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.element === '-1'))); stickerImg.src = `${BASE}st-helm.webp`; lastPreview = 0;
    },
    isLive:() => live, isActive:() => active, element:() => settings.element, choose:e => choose(e, true), renderer
  };
}
