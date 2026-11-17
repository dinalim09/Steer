// STEER Camera — Luck Lens 오행 포토부스(실시간 카메라 전용, 샘플 사진 모드 없음). 카메라 영상 · 손 위치는 기기 안에서만 처리한다.
// 촬영한 최종 사진만 QR 저장을 위해 임시 스토리지에 올리고(share-config.js가 설정된 경우), 24시간 뒤 자동 삭제된다.
import {createFisheye} from './fisheye.js?v=20261117-p1';
import {createFilterPreviews} from './filter-previews.js?v=20261117-p1';
import {createPalmOverlay} from './palm-overlay.js?v=20261117-p1';
import {shareEnabled, shareConfig, newId, upload, pageURL} from './share.js';

const BASE = new URL('./', import.meta.url).href;
// 어안 왜곡 강도: 0.65(중앙 1.27배) → 0.92(중앙 1.80배, 가장자리 2.8배 압축). tan 발산 한계 1.309보다 충분히 낮다
const N = 512, STRENGTH = .92, FADE = 380;
const COLORS = ['#c2ff0a', '#ff8778', '#ffcc45', '#baa7ef', '#87dff4'], HELM = '#ffffff';   // ALL(기본) 필터 강조색: 흰색
const KEYS = ['wood', 'fire', 'earth', 'metal', 'water'], NAMES = ['木 나무', '火 불', '土 흙', '金 쇠', '水 물'];
const keyOf = e => e < 0 ? 'helm' : KEYS[e];
const HINT = {loading:'손 인식을 준비하고 있어요', searching:'카메라에 손바닥을 펴보세요!', found:'오늘의 기운을 손바닥에 담아보세요!', unavailable:'카메라에 손바닥을 펴보세요!'};
// 카메라를 쓸 수 없을 때 렌즈 안에 띄우는 안내(샘플 사진으로 대체하지 않는다)
const STATE = {
  connecting:['카메라를 연결하고 있어요', ''],
  denied:['카메라를 허용해야 Luck Lens를 사용할 수 있어요', '권한 요청이 다시 뜨지 않으면 주소창 왼쪽 ‘가가’ › 웹 사이트 설정 › 카메라를 ‘허용’으로 바꾸거나, 설정 앱 › Safari › 카메라에서 ‘묻기’ 또는 ‘허용’을 선택한 뒤 다시 시도해 주세요.'],
  notfound:['사용할 수 있는 카메라를 찾지 못했어요', '기기에 카메라가 연결되어 있는지 확인한 뒤 다시 시도해 주세요.'],
  busy:['다른 앱이 카메라를 사용하고 있어요', '카메라를 쓰는 다른 앱이나 탭을 닫은 뒤 다시 시도해 주세요.'],
  ended:['카메라 연결이 끊어졌어요', '다시 시도를 누르면 카메라를 다시 연결합니다.'],
  unsupported:['이 브라우저에서는 카메라를 쓸 수 없어요', 'iPad Safari 최신 버전에서 https 주소로 열어 주세요.'],
  error:['카메라를 시작하지 못했어요', '다시 시도를 눌러 주세요.']
};

const CSS = `
.llz{position:absolute;inset:0;background:#0A0A0A;color:#fff;font-family:Pretendard,'Noto Sans KR',system-ui,sans-serif;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;--accent:${HELM}}
.llz button,.llz a{font:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.llz .ll-lens{position:absolute;left:393px;top:92px;width:579px;height:579px;box-sizing:border-box;border:11.354px solid var(--accent);border-radius:50%;overflow:hidden;background:#141414;box-shadow:0 22px 50.6px rgba(0,0,0,.25);transition:border-color .38s ease}
.llz .ll-lens canvas{position:absolute;left:0;top:0;width:100%;height:100%;display:block;opacity:0;transition:opacity .25s ease}
.llz.live .ll-lens canvas{opacity:1}
.llz .ll-state{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 64px;text-align:center;gap:14px;word-break:keep-all}
.llz.live .ll-state{display:none}
.llz .ll-state h3{margin:0;font-size:26px;font-weight:600;line-height:1.4;letter-spacing:-.01em;color:#fff}
.llz .ll-state p{margin:0;font-size:17px;line-height:1.6;color:rgba(255,255,255,.66)}
.llz .ll-state p:empty{display:none}
.llz .ll-retry{margin-top:10px;min-width:160px;height:56px;padding:0 28px;border:0;border-radius:28px;background:var(--accent);color:#0A0A0A;font-size:20px;font-weight:600;cursor:pointer;transition:transform .15s ease}
.llz .ll-retry.press{transform:scale(.96)}
.llz .ll-retry[hidden]{display:none}
.llz .ll-spin{width:44px;height:44px;border-radius:50%;border:4px solid rgba(255,255,255,.18);border-top-color:var(--accent);animation:llSpin .9s linear infinite}
.llz .ll-spin[hidden]{display:none}
@keyframes llSpin{to{transform:rotate(360deg)}}
.llz .ll-hint{position:absolute;left:683px;top:697px;transform:translateX(-50%);padding:10px 25px;box-sizing:border-box;border-radius:100px;background:rgba(242,242,242,.1);font-size:18px;font-weight:400;line-height:1.65;letter-spacing:-.18px;white-space:nowrap;color:#fff;transition:opacity .25s ease}
.llz:not(.live) .ll-hint{opacity:0}
/* 오행 필터 다이얼(Figma 2576:20451): 반지름 720 원호 위 12° 간격. 가운데 = 선택(104, 테두리 5), 양옆 76 · 투명도 .8/.6/.4.
   좌우로 끌어 돌리고(인스타 스토리 필터처럼 지나가는 필터가 바로 적용), 멈추면 가운데에 촬영 아이콘이 뜬다 */
.llz .ll-dial{position:absolute;left:0;top:756px;width:1366px;height:268px;touch-action:none;transition:opacity .25s ease;cursor:grab}
.llz .ll-dial.drag{cursor:grabbing}
.llz .ll-f{position:absolute;left:0;top:0;width:104px;height:104px;padding:0;border:0;border-radius:50%;background:#1A1A1A;cursor:pointer;transform-origin:52px 52px;will-change:transform,opacity}
.llz .ll-f canvas{position:absolute;inset:0;width:100%;height:100%;border-radius:50%;display:block;transition:opacity .2s}
.llz:not(.live) .ll-f canvas{opacity:0}
.llz .ll-f i{position:absolute;inset:0;border-radius:50%;box-sizing:border-box;border:5px solid var(--c);opacity:var(--ring,0)}
/* 왼쪽 필터 그래픽(Figma 2583:20524 Sticker/火 Fire: 247.6×140.1 @ 76,312 → 중심 200,382). 선택한 필터의 스티커로 교차 페이드 */
.llz .ll-side{position:absolute;left:0;top:88px;width:393px;height:600px;pointer-events:none}
.llz .ll-side img{position:absolute;left:200px;top:294px;height:150.3px;width:auto;transform:translate(-50%,-50%) scale(.9) rotate(-4deg);opacity:0;transition:opacity .28s ease,transform .38s cubic-bezier(.2,.9,.3,1.25)}
.llz .ll-side img.on{opacity:1;transform:translate(-50%,-50%)}
.llz .ll-side img[data-element="-1"]{height:360px}   /* ALL(helm) 이미지는 여백이 커서(그림 279/551px) 크게 잡아 그림 높이 약 182px로 맞춘다 */
.llz .ll-ptr{position:absolute;left:675px;top:768px;width:16px;height:12px;color:var(--accent);transition:color .25s ease}
.llz .ll-ptr svg{display:block}
.llz .ll-name{position:absolute;left:633px;top:906px;width:100px;margin:0;text-align:center;font-size:13px;font-weight:500;line-height:normal;letter-spacing:.52px;white-space:pre;color:var(--accent);transition:color .25s ease}
.llz .ll-shutter{position:absolute;left:631px;top:788px;width:104px;height:104px;padding:0;border:0;border-radius:50%;background:none;cursor:pointer;color:var(--accent);display:flex;align-items:center;justify-content:center;
  opacity:0;transform:scale(.7);pointer-events:none;transition:opacity .2s ease,transform .25s cubic-bezier(.2,.9,.3,1.3)}
.llz .ll-shutter svg{display:block;margin:0 0 0 -.4px}
.llz.settled.live:not(.busy) .ll-shutter{opacity:1;transform:none;pointer-events:auto}
.llz.settled.live:not(.busy) .ll-shutter.press{transform:scale(.96)}
.llz .ll-count{position:absolute;left:404.354px;top:103.354px;width:556.292px;height:556.292px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:160px;font-weight:700;color:#fff;text-shadow:0 4px 24px rgba(0,0,0,.35);pointer-events:none;opacity:0}
.llz .ll-count.on{animation:llCount 1s ease both}
@keyframes llCount{0%{opacity:0;transform:scale(1.25)}20%{opacity:1;transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(.92)}}
.llz .ll-flash{position:absolute;left:404.354px;top:103.354px;width:556.292px;height:556.292px;border-radius:50%;background:#fff;opacity:0;pointer-events:none}
.llz .ll-flash.on{animation:llFlash .5s ease-out both}
@keyframes llFlash{0%{opacity:.9}100%{opacity:0}}
.llz .ll-actions{position:absolute;left:684px;top:790px;transform:translateX(-50%);display:none;gap:16px}
.llz .ll-actions button,.llz .ll-actions a{display:inline-flex;align-items:center;justify-content:center;min-width:180px;height:64px;padding:0 28px;box-sizing:border-box;border-radius:32px;border:0;font-size:22px;font-weight:600;text-decoration:none;cursor:pointer;transition:transform .15s ease}
.llz .ll-actions .press{transform:scale(.96)}
.llz .ll-retake{background:rgba(255,255,255,.12);color:#fff}
.llz .ll-save{background:var(--accent);color:#0A0A0A}
.llz.result .ll-actions{display:flex}
.llz.result .ll-dial,.llz.result .ll-shutter,.llz.result .ll-hint,.llz.result .ll-ptr,.llz.result .ll-name{opacity:0;pointer-events:none}
.llz.busy .ll-dial{pointer-events:none}
/* QR 저장 패널: 결과 화면에서 렌즈 오른쪽 빈 영역(974~1366)의 가운데. 업로드 중 → QR → 실패 시 다시 시도 */
.llz .ll-qr{position:absolute;left:1022px;top:206px;width:300px;height:368px;box-sizing:border-box;border-radius:28px;background:#fff;color:#0A0A0A;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 26px;text-align:center;word-break:keep-all;opacity:0;visibility:hidden;transform:translateY(8px);transition:opacity .3s ease,transform .3s ease,visibility 0s linear .3s}
.llz.result .ll-qr.on{opacity:1;visibility:visible;transform:none;transition:opacity .3s ease .15s,transform .3s ease .15s,visibility 0s}
.llz .ll-qr-box{width:220px;height:220px;display:flex;align-items:center;justify-content:center}
.llz .ll-qr-box canvas{display:block}
.llz .ll-qr h4{margin:18px 0 0;font-size:19px;font-weight:600;line-height:1.4;letter-spacing:-.01em}
.llz .ll-qr p{margin:6px 0 0;font-size:14px;line-height:1.5;color:rgba(10,10,10,.55)}
.llz .ll-qr .ll-spin{border-color:rgba(10,10,10,.12);border-top-color:var(--accent)}
.llz .ll-qr-retry{margin-top:18px;min-width:150px;height:52px;padding:0 24px;border:0;border-radius:26px;background:#0A0A0A;color:#fff;font-size:18px;font-weight:600;cursor:pointer;transition:transform .15s ease}
.llz .ll-qr-retry.press{transform:scale(.96)}
.llz .ll-qr[data-s=ready] .ll-spin,.llz .ll-qr[data-s=error] .ll-spin,.llz .ll-qr:not([data-s=ready]) .ll-qr-box canvas,.llz .ll-qr:not([data-s=error]) .ll-qr-retry{display:none}
.llz .ll-qr[data-s=error] .ll-qr-box{height:auto}
.llz.qr .ll-save{display:none}
.llz .ll-video{position:absolute;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none}
.llz .ll-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.llz .ll-count.on{animation-duration:.01s}.llz .ll-flash.on{animation:none}.llz .ll-qr,.llz.result .ll-qr.on{transition:none;transform:none}}
`;

// 다이얼 원호: 가운데 필터 중심(683, 840) · 반지름 720.2 · 12° 간격 (Figma 좌표에서 역산)
const DIAL = {cx:683, cy:1560.2, r:720.2, step:12 * Math.PI / 180, top:756};
const PX_PER = DIAL.r * DIAL.step;   // 필터 한 칸 = 원호 길이 약 151px
const ORDER = [-1, 0, 1, 2, 3, 4];
const LABEL = {'-1':'ALL', 0:'木  WOOD', 1:'火  FIRE', 2:'土  EARTH', 3:'金  METAL', 4:'水  WATER'};
// 촬영 아이콘(Figma 2576:20519) — 강조색 부분은 currentColor(선택 필터 색)
const SHUTTER = `<svg width="50" height="50" viewBox="0 0 50 50" fill="none" aria-hidden="true"><path d="M25.2924 5.10365e-07C26.7266 4.83356e-07 27.9107 -0.000953085 28.8852 0.0820318C29.8891 0.167549 30.7963 0.350011 31.6713 0.783204C33.2302 1.55503 34.2158 2.78154 34.9077 4.01172C35.5705 5.19044 36.0504 6.54886 36.4536 7.55664L37.1743 9.3584C39.5919 9.37464 41.3629 9.46252 42.9018 10.1084C45.1006 11.0314 46.8863 12.7331 47.9272 14.8887C48.3915 15.8504 48.6281 16.8843 48.7846 18.084C48.9389 19.2671 49.0279 20.7307 49.1411 22.5654L49.5004 28.3906C49.7824 32.9624 50.0084 36.5687 49.8012 39.3906C49.5905 42.2601 48.9171 44.6008 47.1821 46.4727C45.4433 48.3482 43.1696 49.1805 40.3452 49.5742C37.5731 49.9606 34.0019 49.9561 29.4838 49.9561H20.3979C15.8798 49.9561 12.3086 49.9605 9.53656 49.5742C6.71205 49.1805 4.43842 48.3482 2.69965 46.4727C0.964441 44.6008 0.291253 42.2602 0.0805065 39.3906C-0.126677 36.5687 0.0993305 32.9624 0.381288 28.3906L0.740663 22.5654C0.853817 20.7307 0.942811 19.2671 1.09711 18.084C1.25361 16.8843 1.49023 15.8503 1.95453 14.8887C2.99547 12.7332 4.7811 11.0313 6.97992 10.1084C8.64897 9.40799 10.5913 9.3637 13.3354 9.35547C13.3603 9.35541 13.385 9.35743 13.4096 9.3584L14.1313 7.55664C14.5344 6.54892 15.0144 5.19039 15.6772 4.01172C16.369 2.78163 17.3548 1.55504 18.9135 0.783204C19.7884 0.350038 20.6958 0.167558 21.6996 0.0820318C22.6742 -0.000966783 23.8583 3.86499e-07 25.2924 5.10365e-07ZM3.63129 32.4062C3.48281 35.1726 3.42024 37.3519 3.55121 39.1357C3.5728 39.4297 3.59953 39.7089 3.63129 39.9746V32.4062Z" fill="#0A0A0A"/><path d="M33.4107 29.5657C33.4107 34.0505 29.7751 37.6861 25.2903 37.6861C20.8055 37.6861 17.1699 34.0505 17.1699 29.5657C17.1699 25.0809 20.8055 21.4453 25.2903 21.4453C29.7751 21.4453 33.4107 25.0809 33.4107 29.5657Z" fill="#0A0A0A" stroke="currentColor" stroke-width="3.48017"/><path d="M25.2867 11.0078H25.3075" stroke="currentColor" stroke-width="4.64022" stroke-linecap="round" stroke-linejoin="round"/><rect x="3.12305" y="31.8672" width="2.77101" height="8.31303" fill="#0A0A0A"/></svg>`;
const POINTER = `<svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M0 0H16L8 12L0 0Z" fill="currentColor"/></svg>`;

export function createLens(root, hooks = {}){
  if (!document.getElementById('llz-css')) { const st = document.createElement('style'); st.id = 'llz-css'; st.textContent = CSS; document.head.appendChild(st); }
  root.classList.add('llz');
  root.innerHTML = `
    <div class="ll-lens"><canvas class="ll-out" width="${N}" height="${N}" role="img" aria-label="Luck Lens 미리보기"></canvas>
      <div class="ll-state" role="status" aria-live="polite"><span class="ll-spin" aria-hidden="true"></span><h3></h3><p></p><button class="ll-retry" type="button" hidden>다시 시도</button></div></div>
    <div class="ll-count" aria-live="assertive"></div><div class="ll-flash"></div>
    <div class="ll-hint" aria-live="polite">${HINT.searching}</div>
    <div class="ll-dial" role="group" aria-label="오행 필터 다이얼 — 좌우로 돌려 필터를 고르세요">
      ${ORDER.map(e => `<button class="ll-f" type="button" data-element="${e}" aria-pressed="${e < 0}" aria-label="${e < 0 ? '기본(ALL)' : NAMES[e]} 필터" style="--c:${e < 0 ? HELM : COLORS[e]}"><canvas class="filter-preview"></canvas><i></i></button>`).join('')}
    </div>
    <div class="ll-side" aria-hidden="true">${ORDER.map(e => `<img src="${BASE}st-${keyOf(e)}.webp" alt="" decoding="async" data-element="${e}"${e < 0 ? ' class="on"' : ''}>`).join('')}</div>
    <span class="ll-ptr">${POINTER}</span><p class="ll-name" aria-hidden="true">${LABEL[-1]}</p>
    <button class="ll-shutter" type="button" aria-label="3초 뒤 촬영" disabled>${SHUTTER}</button>
    <div class="ll-actions"><button class="ll-retake" type="button">다시 찍기</button><a class="ll-save" download="Steer-Luck-Lens.png" href="#">사진 저장</a></div>
    <div class="ll-qr" role="status" aria-live="polite"><div class="ll-qr-box"><span class="ll-spin" aria-hidden="true"></span><canvas role="img" aria-label="사진 저장용 QR 코드"></canvas></div><h4></h4><p></p><button class="ll-qr-retry" type="button">다시 시도</button></div>
    <p class="ll-sr">${shareEnabled() ? '카메라 영상과 손 위치는 기기 안에서만 처리됩니다. 촬영한 사진은 QR 저장을 위해 임시 저장소에 올라가며 ' + shareConfig.ttlHours + '시간 뒤 자동으로 삭제됩니다.' : '카메라 영상·손 위치·촬영 사진은 기기 안에서 처리되며 서버로 전송되지 않습니다.'}</p>
    <video class="ll-video" autoplay playsinline muted></video>`;
  const $ = s => root.querySelector(s);
  const video = $('.ll-video'), out = $('.ll-out'), hint = $('.ll-hint'), shutter = $('.ll-shutter');
  const stateH = $('.ll-state h3'), stateP = $('.ll-state p'), spin = $('.ll-spin'), retry = $('.ll-retry');
  const sides = [...root.querySelectorAll('.ll-side img')];
  const count = $('.ll-count'), flash = $('.ll-flash'), save = $('.ll-save'), buttons = [...root.querySelectorAll('.ll-f')];
  const qr = $('.ll-qr'), qrCanvas = $('.ll-qr-box canvas'), qrH = $('.ll-qr h4'), qrP = $('.ll-qr p'), qrRetry = $('.ll-qr-retry');
  const SHARE_ON = shareEnabled();
  if (SHARE_ON) root.classList.add('qr');
  const renderer = createFisheye(out), previews = createFilterPreviews(buttons, STRENGTH, 160, 160), palm = createPalmOverlay();
  const frame = document.createElement('canvas'); frame.width = frame.height = N; const fctx = frame.getContext('2d', {willReadFrequently:renderer.type !== 'webgl'});
  const stickers = {}; for (const k of ['helm', ...KEYS]) { const im = new Image(); im.decoding = 'async'; im.src = `${BASE}st-${k}.webp`; stickers[k] = im; }
  const settings = {strength:STRENGTH, element:-1, from:-1, t:1, amount:1};
  let stream = null, request = 0, live = false, shown = false, active = false, raf = 0, fadeStart = 0, lastPreview = 0, hintState = '', result = false, busy = false, saveURL = '', timers = [], resumeLive = false;

  const emit = (type, extra = {}) => { try { hooks.event && hooks.event(type, {element:keyOf(settings.element), ...extra}); } catch {} };
  const setHint = k => { if (hintState !== k) { hintState = k; hint.textContent = HINT[k]; } };
  // 렌즈 안 상태 안내: connecting(로딩) · denied · notfound · busy · ended · unsupported · error
  function setState(k){
    const [h, p] = STATE[k]; stateH.textContent = h; stateP.textContent = p;
    spin.hidden = k !== 'connecting'; retry.hidden = k === 'connecting';
  }
  // 첫 실시간 프레임이 그려진 뒤에만 렌즈 · 썸네일을 보인다(이전 화면의 정지 프레임이 남지 않도록). 그 전에는 촬영 버튼 비활성
  function setShown(on){ shown = on; root.classList.toggle('live', on); shutter.disabled = !on || busy; }

  function choose(e, quiet){
    if (busy || result) return;
    if (e === settings.element) return;
    settings.from = settings.element; settings.element = e; settings.t = 0; fadeStart = performance.now();
    root.style.setProperty('--accent', e < 0 ? HELM : COLORS[e]);
    sides.forEach(im => im.classList.toggle('on', Number(im.dataset.element) === e));
    buttons.forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.element) === e)));
    if (!quiet) emit('filter');
  }
  // ---- 다이얼: pos = 가운데에 온 필터의 순번(0 = ALL … 5 = 水, 소수 = 도는 중) ----
  const dial = $('.ll-dial'), nameEl = $('.ll-name'), LAST = ORDER.length - 1;
  let pos = 0, anim = 0, settledAt = -1, drag = null, moved = false;
  function layout(){
    buttons.forEach((b, i) => {
      const d = i - pos, ad = Math.abs(d), a = d * DIAL.step;
      const x = DIAL.cx + DIAL.r * Math.sin(a), y = DIAL.cy - DIAL.r * Math.cos(a) - DIAL.top;
      const sc = (76 + 28 * Math.max(0, 1 - ad)) / 104, op = ad <= 1 ? 1 - .2 * ad : Math.max(0, .8 - .2 * (ad - 1));
      b.style.transform = `translate(${(x - 52).toFixed(2)}px,${(y - 52).toFixed(2)}px) scale(${sc.toFixed(4)})`;
      b.style.opacity = op.toFixed(3); b.style.setProperty('--ring', Math.max(0, 1 - ad * 2).toFixed(3));
      b.style.visibility = op <= .01 ? 'hidden' : ''; b.tabIndex = op <= .01 ? -1 : 0;
    });
    const near = ORDER[Math.max(0, Math.min(LAST, Math.round(pos)))];
    if (near !== settings.element) choose(near, true);
    nameEl.textContent = LABEL[near];
  }
  function setSettled(on){
    root.classList.toggle('settled', on);
    const e = ORDER[Math.round(pos)];
    shutter.setAttribute('aria-label', (e < 0 ? '기본(ALL)' : NAMES[e]) + ' 필터로 3초 뒤 촬영');
    if (on && settledAt !== e) { settledAt = e; emit('filter'); }
  }
  // 목표 칸으로 0.38초 감속 이동
  function spinTo(target){
    target = Math.max(0, Math.min(LAST, Math.round(target))); cancelAnimationFrame(anim);
    const from = pos, t0 = performance.now(), dur = Math.min(520, 240 + Math.abs(target - from) * 90);
    setSettled(false);
    const stepA = now => { const x = Math.min(1, (now - t0) / dur), k = 1 - Math.pow(1 - x, 3);
      pos = from + (target - from) * k; layout();
      if (x < 1) anim = requestAnimationFrame(stepA); else { anim = 0; pos = target; layout(); setSettled(true); } };
    anim = requestAnimationFrame(stepA);
  }
  const scale = () => root.getBoundingClientRect().width / 1366 || 1;
  const down = ev => {
    if (busy || result) return;
    cancelAnimationFrame(anim); anim = 0;
    drag = {id:ev.pointerId, x:ev.clientX, p:pos, k:scale(), hist:[[performance.now(), ev.clientX]]}; moved = false;
    // 포인터 캡처는 실제로 끌기 시작한 뒤에만 건다 — 처음부터 걸면 탭의 click이 버튼(필터·촬영 아이콘)에 닿지 않는다
  };
  dial.addEventListener('pointerdown', down);
  shutter.addEventListener('pointerdown', down);   // 촬영 아이콘 위에서 시작해도 다이얼이 돈다
  root.addEventListener('pointermove', ev => {
    if (!drag || ev.pointerId !== drag.id) return;
    const dx = (ev.clientX - drag.x) / drag.k;
    if (!moved && Math.abs(dx) < 6) return;
    if (!moved) { moved = true; dial.classList.add('drag'); setSettled(false); try { dial.setPointerCapture(ev.pointerId); } catch {} }
    let p = drag.p - dx / PX_PER;
    if (p < 0) p = p * .3; else if (p > LAST) p = LAST + (p - LAST) * .3;   // 양 끝에서는 고무줄처럼 덜 움직인다
    pos = p; layout();
    drag.hist.push([performance.now(), ev.clientX]); if (drag.hist.length > 6) drag.hist.shift();
  });
  const endDrag = ev => {
    if (!drag || ev.pointerId !== drag.id) return;
    const d = drag; drag = null; dial.classList.remove('drag');
    if (!moved) { if (Math.abs(pos - Math.round(pos)) > .001) spinTo(pos); else setSettled(true); return; }   // 탭은 click에서 처리
    const h = d.hist, a = h[0], b = h[h.length - 1], dt = Math.max(16, b[0] - a[0]);
    const v = (b[1] - a[1]) / d.k / dt;   // px/ms (오른쪽 +)
    spinTo(pos - v * 180 / PX_PER);       // 튕긴 만큼 조금 더 돈 뒤 가장 가까운 칸에 멈춘다
  };
  root.addEventListener('pointerup', endDrag); root.addEventListener('pointercancel', endDrag);
  // 탭: 다른 필터를 누르면 그 필터가 가운데로 온다(키보드 Enter도 같음). 가운데 필터 위의 촬영 아이콘은 shutter 버튼이 받는다
  buttons.forEach((b, i) => b.addEventListener('click', ev => {
    if (moved) { moved = false; ev.preventDefault(); return; }
    if (busy || result) return;
    if (i !== Math.round(pos) || anim) spinTo(i);
  }));
  dial.addEventListener('keydown', ev => { if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); spinTo(Math.round(pos) + (ev.key === 'ArrowRight' ? 1 : -1)); } });
  layout(); setSettled(true);

  // 정사각 중앙 크롭 + 좌우 반전(거울)
  function drawVideo(){
    const vw = video.videoWidth, vh = video.videoHeight; if (!vw || !vh) return false;
    const s = Math.min(vw, vh); fctx.save(); fctx.setTransform(-1, 0, 0, 1, N, 0); fctx.drawImage(video, (vw - s) / 2, (vh - s) / 2, s, s, 0, 0, N, N); fctx.restore(); return true;
  }
  // 프레임 속도: 카메라 영상은 초당 약 30장이므로, 새 영상 프레임이 왔을 때만 렌즈를 다시 그린다.
  // 120Hz iPad에서 같은 영상을 화면 주기마다 4번씩 다시 그리던 낭비를 없앤다. 필터 전환 중에는 매 화면 주기 그린다.
  // requestVideoFrameCallback이 없는 브라우저는 33ms 간격으로 제한한다
  const RVFC = typeof video.requestVideoFrameCallback === 'function';
  let freshFrame = true, lastDraw = 0, vfc = 0;
  const watchFrames = () => { if (RVFC && !vfc) vfc = video.requestVideoFrameCallback(() => { vfc = 0; freshFrame = true; if (live) watchFrames(); }); };
  // 필터 썸네일 5개는 한 프레임에 하나씩 나눠 그린다(한 번에 다섯 개를 그리면 iPad에서 주기적으로 끊김이 생긴다). 하나당 약 60ms 간격
  const PREVIEW_STEP = 60;
  function tick(now){
    raf = 0; if (!active || result || !live) return;
    const fading = settings.t < 1;
    if (fading) { const x = Math.min(1, (now - fadeStart) / FADE); settings.t = x * x * (3 - 2 * x); if (x >= 1) { settings.t = 1; settings.from = settings.element; } }
    const due = RVFC ? freshFrame : now - lastDraw >= 33;
    if ((due || fading || !shown) && video.videoWidth && video.videoHeight) {
      freshFrame = false; lastDraw = now; watchFrames();
      // WebGL은 영상을 직접 받아 셰이더에서 크롭 · 반전한다. 512 프레임 캔버스는 손 인식 · 썸네일에 필요할 때만 그린다
      const previewDue = now - lastPreview > PREVIEW_STEP, direct = renderer.video;
      if (!direct || palm.scanDue(now) || (previewDue && previews.needsFrame())) drawVideo();
      palm.scanHands(frame, now); const st = palm.paintPalm(stickers[keyOf(settings.element)], now);
      setHint(st); renderer.render(direct ? video : frame, palm.ink, settings, palm.inkChanged());
      if (previewDue) { lastPreview = now; previews.renderNext(frame, true); }
      if (!shown) setShown(true);
    }
    raf = requestAnimationFrame(tick);
  }
  const loop = () => { if (!raf && active) raf = requestAnimationFrame(tick); };

  function stopCamera(){
    request++;
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; emit('camera_stop'); }
    video.pause(); video.srcObject = null; live = false; palm.clear(); setShown(false); lastPreview = 0; freshFrame = true;
  }
  // 화면을 떠날 때(Camera 닫기 · 90초 비활동 복귀)는 스트림을 끊지 않고 쉬게만 한다.
  // iPad 홈 화면 웹앱 · Safari(묻기)는 getUserMedia를 다시 부를 때마다 권한을 다시 물으므로, 한 번 받은 스트림을 페이지가 살아 있는 동안 재사용한다
  function parkCamera(){
    request++; video.pause(); live = false; palm.clear(); setShown(false); lastPreview = 0; freshFrame = true;
    if (stream) emit('camera_park');
  }
  // 카메라 권한 진단: 요청 직전 권한 상태(granted · prompt · denied · unknown), 실행 방식(홈 화면 웹앱 app · Safari browser),
  // 요청부터 영상 수신까지 걸린 시간(wait_ms — 허용창이 떴다면 길어진다)을 이벤트와 window.steerLensCam에 남긴다. 권한 자체를 바꾸지는 않는다
  const APP_MODE = (() => { try { return navigator.standalone === true || matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches; } catch { return false; } })();
  const camDiag = window.steerLensCam = {mode:APP_MODE ? 'app' : 'browser', requests:0, last:null};
  const permState = () => !navigator.permissions || !navigator.permissions.query ? Promise.resolve('unknown')
    : Promise.race([navigator.permissions.query({name:'camera'}).then(r => r.state, () => 'unknown'), new Promise(r => setTimeout(() => r('unknown'), 300))]);
  let camInfo = {};
  function fail(k, reason){ stopCamera(); setState(k); emit(k === 'denied' ? 'camera_denied' : 'camera_error', {reason, ...camInfo}); }
  async function openCamera(){
    if (stream) {   // 이미 받은 스트림은 그대로 다시 쓴다(권한을 다시 묻지 않음). 트랙이 끝났으면 새로 요청
      if (live) return;
      if (stream.getVideoTracks().some(t => t.readyState === 'live')) {
        const token = ++request; setShown(false); setState('connecting');
        try { await video.play(); } catch {}
        if (token !== request || !active) return;
        live = true; lastPreview = 0; setHint('loading'); loop(); palm.start(); emit('camera_resume', {mode:camDiag.mode});
        return;
      }
      stopCamera();
    }
    const token = ++request; setShown(false); setState('connecting');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) { fail('unsupported', 'unsupported'); return; }
    const perm = await permState(); if (token !== request || !active) return;
    const t0 = performance.now(); camDiag.requests++; camInfo = {perm, mode:camDiag.mode};
    try {
      const s = await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:{ideal:'user'}, width:{ideal:1280}, height:{ideal:720}}});
      camInfo.wait_ms = Math.round(performance.now() - t0); camDiag.last = {...camInfo, at:new Date().toISOString()};
      if (token !== request || !active) { s.getTracks().forEach(t => t.stop()); return; }
      stream = s; video.srcObject = s; try { await video.play(); } catch {}
      s.getVideoTracks().forEach(t => t.addEventListener('ended', () => { if (stream === s && active) fail('ended', 'track_ended'); }));
      live = true; lastPreview = 0; setHint('loading'); loop();
      palm.start(); emit('camera_start', camInfo);
    } catch (err) {
      if (token !== request) return;
      const n = err && err.name; camInfo.wait_ms = Math.round(performance.now() - t0); camDiag.last = {...camInfo, error:n || 'error', at:new Date().toISOString()};
      fail(n === 'NotAllowedError' || n === 'SecurityError' ? 'denied' : n === 'NotFoundError' || n === 'OverconstrainedError' ? 'notfound' : n === 'NotReadableError' || n === 'AbortError' ? 'busy' : 'error', n || 'error');
    }
  }
  retry.addEventListener('click', () => { if (active) { emit('camera_retry'); openCamera(); } });

  // ---- QR 저장: 결과 사진 업로드 → 고유 주소 QR. 촬영마다 새 ID, 다시 찍기 · 화면 이탈 · 비활동 복귀 때 업로드를 취소하고 QR을 지운다
  const QR_TEXT = {
    loading:['QR 코드를 만들고 있어요', '잠시만 기다려 주세요'],
    ready:['스마트폰으로 스캔해 사진을 저장하세요', '사진은 ' + shareConfig.ttlHours + '시간 뒤 자동으로 삭제됩니다'],
    error:['사진을 올리지 못했어요', '네트워크를 확인한 뒤 다시 시도해 주세요']
  };
  let shareSeq = 0, shareCtl = null, shareBlob = null, qrLib = null;
  const loadQR = () => qrLib || (qrLib = import('./vendor/qrcode.mjs').then(m => m.default).catch(e => { qrLib = null; throw e; }));
  function setQR(k){
    qr.dataset.s = k; qrH.textContent = QR_TEXT[k][0]; qrP.textContent = QR_TEXT[k][1]; qr.classList.add('on');
  }
  function clearShare(){
    shareSeq++; if (shareCtl) { shareCtl.abort(); shareCtl = null; }
    shareBlob = null; qr.classList.remove('on'); delete qr.dataset.s; qrH.textContent = ''; qrP.textContent = '';
    qrCanvas.width = qrCanvas.height = 0;   // 이전 관람객의 QR 픽셀을 남기지 않는다
  }
  function drawQR(make, url){
    const q = make(0, 'M'); q.addData(url); q.make();
    const n = q.getModuleCount(), cell = Math.max(2, Math.floor(440 / n)), size = n * cell;
    qrCanvas.width = qrCanvas.height = size; qrCanvas.style.width = qrCanvas.style.height = size / 2 + 'px';   // 2배 해상도 정수 배율 → 모듈 경계가 흐리지 않다
    const g = qrCanvas.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, size, size); g.fillStyle = '#0A0A0A';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) g.fillRect(c * cell, r * cell, cell, cell);
  }
  async function share(retrying){
    if (!SHARE_ON || !shareBlob || !result) return;
    const seq = ++shareSeq, ctl = shareCtl = new AbortController(), id = newId();
    setQR('loading'); if (retrying) emit('share_retry');
    try {
      const [make] = await Promise.all([loadQR(), upload(shareBlob, id, ctl.signal)]);
      if (seq !== shareSeq || !result) return;
      drawQR(make, pageURL(id)); setQR('ready'); emit('share_ready');
    } catch (e) {
      if (seq !== shareSeq || !result) return;
      setQR('error'); emit('share_error', {reason:(e && e.reason) || 'error'});
    } finally { if (shareCtl === ctl) shareCtl = null; }
  }
  qrRetry.addEventListener('click', () => share(true));

  function clearTimers(){ timers.forEach(clearTimeout); timers = []; }
  function capture(){
    if (busy || result || !active || !shown) return;
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
    if (!live) { busy = false; root.classList.remove('busy'); setShown(false); return; }   // 촬영 중 카메라가 끊긴 경우: 결과를 만들지 않는다
    if (drawVideo()) { palm.paintPalm(stickers[keyOf(settings.element)], performance.now()); renderer.render(frame, palm.ink, settings); }
    const shot = document.createElement('canvas'); shot.width = shot.height = 900; const c = shot.getContext('2d');
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim() || HELM;
    c.fillStyle = '#0A0A0A'; c.fillRect(0, 0, 900, 900);
    c.save(); c.beginPath(); c.arc(450, 440, 400, 0, Math.PI * 2); c.clip(); c.drawImage(renderer.canvas, 50, 40, 800, 800); c.restore();
    c.lineWidth = 12; c.strokeStyle = accent; c.beginPath(); c.arc(450, 440, 400, 0, Math.PI * 2); c.stroke();
    result = true; busy = false; root.classList.remove('busy'); root.classList.add('result'); shutter.disabled = !shown;
    flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    save.removeAttribute('href'); clearShare();
    if (SHARE_ON) { setQR('loading'); const seq = shareSeq; shot.toBlob(b => { if (seq !== shareSeq || !result) return; if (!b) { setQR('error'); return; } shareBlob = b; share(false); }, 'image/jpeg', .92); }
    else shot.toBlob(b => { if (!b || !result) return; if (saveURL) URL.revokeObjectURL(saveURL); saveURL = URL.createObjectURL(b); save.href = saveURL; }, 'image/png');
    emit('capture');
  }
  function retake(){
    if (!result) return; result = false; root.classList.remove('result'); save.removeAttribute('href'); clearShare();
    if (saveURL) { URL.revokeObjectURL(saveURL); saveURL = ''; } loop();
  }
  shutter.addEventListener('click', () => { if (moved) { moved = false; return; } capture(); });
  $('.ll-retake').addEventListener('click', () => { retake(); emit('retake'); });
  save.addEventListener('click', ev => { if (!save.getAttribute('href')) { ev.preventDefault(); return; } emit('save'); });
  const onKey = ev => { if (active && ev.key === 'Escape' && result) retake(); };
  const onVis = () => { if (!active) return; if (document.hidden) { resumeLive = live; stopCamera(); } else if (resumeLive) { resumeLive = false; openCamera(); } };
  document.addEventListener('keydown', onKey); document.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', () => stopCamera());

  // 터치 피드백(0.96, 0.15s) — 호버 없음
  root.addEventListener('pointerdown', ev => { const b = ev.target.closest('.ll-shutter,.ll-retry,.ll-qr-retry,.ll-actions button,.ll-actions a'); if (!b || b.disabled) return; b.classList.add('press'); const up = () => { b.classList.remove('press'); window.removeEventListener('pointerup', up, true); window.removeEventListener('pointercancel', up, true); }; window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true); });

  return {
    open(){ if (active) return; active = true; setHint('searching'); openCamera(); },
    close(){
      if (!active) return; active = false; clearTimers(); parkCamera(); resumeLive = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      busy = false; result = false; root.classList.remove('busy', 'result'); setShown(false); setState('connecting');
      count.classList.remove('on'); count.textContent = ''; clearShare(); if (saveURL) { URL.revokeObjectURL(saveURL); saveURL = ''; } save.removeAttribute('href');
      settings.element = settings.from = -1; settings.t = 1; root.style.setProperty('--accent', HELM); sides.forEach(im => im.classList.toggle('on', im.dataset.element === '-1')); buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.element === '-1'))); lastPreview = 0;
      cancelAnimationFrame(anim); anim = 0; drag = null; pos = 0; settledAt = -1; layout(); root.classList.add('settled');
    },
    isLive:() => live, isActive:() => active, element:() => settings.element, choose:e => choose(e, true), renderer
  };
}
