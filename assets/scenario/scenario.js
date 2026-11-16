// STEER Scenario — 평상시(6) · 중요 일정(4) · 깜짝 스팟(5) 장면을 영상과 함께 보여 준다 (Figma 4218:4386 「최종 레이아웃」, S1-1 ~ S3-5)
// 화면: 왼쪽 시나리오 세그먼트 + 제목 + 장면 목록(현재 장면만 펼침), 오른쪽 장면 번호(Megascope) + 16:9 영상 + 진행 눈금.
// 영상은 장면마다 assets/scenario/s{시나리오}-{장면}.mp4 (포스터 .webp). 끝나면 다음 장면으로 넘어가고, 마지막 장면 뒤에는 다음 시나리오로 이어진다.
import MEGA from '../team/mega.js?v=20261116-3';

const BASE = new URL('./', import.meta.url).href;
const NS = 'http://www.w3.org/2000/svg';

export const SCENARIOS = [
  {key:'daily', label:'평상시', eyebrow:'Scenario 01', head:['평범한 하루에 더해지는', '나만의 개운 미션'], scenes:[
    {t:'조타륜을 돌려 조합하는 개운 미션', d:['조타륜을 돌려 오늘의 개운 미션을 직접 조합합니다.', '고정된 용신과 오늘의 일진에 맞춘 조합이', '하나의 개운 미션으로 제안됩니다.']},
    {t:'물 기운을 채우는 음악 한 곡', d:['오늘의 개운 미션은 머물기 · 30분 · 노래.', '물(水)의 기운을 담은 플레이리스트로 하루를 엽니다.']},
    {t:'미션 후 사진 인증', d:['완료한 개운 미션은 사진을 찍어 인증하고,', '오행 스티커로 꾸며 커뮤니티의 피드에 올립니다.']},
    {t:'함께 채우는 기운', d:['같은 기운이 필요한 친구와 그룹 챌린지로 개운 미션을', '함께합니다. 혼자보다 가볍게, 더 오래 개운을 이어갑니다.']},
    {t:'쌓여가는 개운 기록', d:['기록 탭에서 쌓인 개운의 흐름을 한눈에 돌아봅니다.', '작은 실천들이 만든 모습을', '카드·캘린더·맵 형식으로 확인합니다.']},
    {t:'개운데이, 달라진 하루', d:['한 달 중에 기운이 가장 잘 드는 날,', '앱이 개운데이 테마로 바뀝니다.', '오늘의 기운을 확인하고', '더욱 적극적인 한 걸음을 내딛습니다.']},
  ]},
  {key:'event', label:'중요 일정', eyebrow:'Scenario 02', head:['면접을 앞둔 일주일,', '하루씩 쌓아가는 개운 흐름'], scenes:[
    {t:'스티어와 계획하는 준비 일정', d:['이번 달 30일에 면접 일정이 생겼습니다.', '중요 일정을 등록하면 스티어가 D-day까지의 일진을', '파악하고 개운 일정을 준비합니다.']},
    {t:'한강에서 면접 연습', d:['일진이 좋은 날,', '스티어가 제안한 장소에서 미션을 수행하며', '면접 답변을 다듬습니다.']},
    {t:'가득 찬 개운 게이지', d:['준비한 날들이 개운 게이지로 차오릅니다.', '결과보다 쌓아 온 과정이 마음을 단단하게 합니다.']},
    {t:'면접 당일, 당당한 한 걸음', d:['스티어의 워치 악세서리를 곁에 지니고,', '준비된 자세로 하루를 향해 나아갑니다.']},
  ]},
  {key:'spot', label:'깜짝 스팟', eyebrow:'Scenario 03', head:['익숙한 길에서 만나는', '뜻밖의 개운 스팟'], scenes:[
    {t:'익숙한 퇴근길', d:['매일 걷던 퇴근길,', '손목 위로 워치 깜짝 스팟 알림이 울립니다.']},
    {t:'알림을 따라 내딛는 새로운 발걸음', d:['워치가 가리키는 방향을 따라', '처음 가 보는 골목으로 들어섭니다.']},
    {t:'뜻밖의 도착', d:['골목 안쪽에서 오래된 헌책방을 만납니다.', '오늘 필요한 기운이 머무는 곳입니다.']},
    {t:'공간 속 개운 미션', d:['책장 사이를 천천히 거닐다', '마음이 가는 책 한 권을 펼칩니다.', '나무(木)의 기운을 채우는 시간입니다.']},
    {t:'깜짝 스팟 +1', d:['기록 탭 지도에 오늘의 깜짝 스팟이 등록됩니다.', '익숙한 동네에 나만의 개운 지도가 넓어집니다.']},
  ]},
];
const src = (s, i) => BASE + 's' + (s + 1) + '-' + (i + 1);
const pad = n => String(n).padStart(2, '0');

const CSS = `
#scx .scs{position:absolute;inset:0;background:#fff;color:#0A0A0A;font-family:Pretendard,'Noto Sans KR',sans-serif;-webkit-font-smoothing:antialiased}
#scx .sc-seg{position:absolute;left:40px;top:112px;width:420px;height:48px;border-radius:24px;background:#F2F2F2;overflow:hidden}
#scx .sc-pill{position:absolute;left:4px;top:4px;width:136px;height:40px;border-radius:20px;background:#0A0A0A;transition:transform .42s cubic-bezier(.2,.8,.2,1)}
#scx .sc-seg button{position:absolute;top:4px;width:136px;height:40px;border:0;padding:0;margin:0;background:transparent;border-radius:20px;cursor:pointer;
  font:400 18px/1.65 Pretendard,sans-serif;letter-spacing:-.18px;color:#7A7A7A;transition:color .3s;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#scx .sc-seg button.on{font-weight:700;color:#fff}
#scx .sc-seg button:focus-visible,#scx .sc-row:focus-visible{outline:3px solid #87E6FF;outline-offset:2px}
#scx .sc-left{position:absolute;left:40px;top:200px;width:440px}
#scx .sc-eye{margin:0;font:700 14px/1.2 Pretendard,sans-serif;letter-spacing:.28px;color:#35D1FB}
#scx .sc-head{margin:10px 0 0;font:700 40px/1.2 Pretendard,sans-serif;letter-spacing:-1.2px;color:#0A0A0A}
#scx .sc-head span{display:block}
#scx .sc-list{margin:44px 0 0;padding:0;list-style:none}
#scx .sc-row{display:flex;align-items:flex-start;width:100%;box-sizing:border-box;border:0;border-top:1px solid #D6D6D6;margin:0;padding:12px 0;background:transparent;text-align:left;cursor:pointer;
  color:inherit;font:inherit;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:padding .42s cubic-bezier(.2,.8,.2,1),border-color .3s}
#scx .sc-row.on{border-top:2px solid #0A0A0A;padding:22px 0 26px}
#scx .sc-num{flex:0 0 40px;padding-top:4px;font:500 14px/1.2 Pretendard,sans-serif;letter-spacing:.28px;color:#7A7A7A;transition:padding .42s cubic-bezier(.2,.8,.2,1),color .3s}
#scx .sc-row.on .sc-num{padding-top:8px;font-weight:700;color:#0A0A0A}
#scx .sc-txt{flex:1 1 0;min-width:0}
#scx .sc-t{display:block;font:400 18px/1.65 Pretendard,sans-serif;letter-spacing:-.18px;color:#7A7A7A;white-space:nowrap;transition:color .3s}
#scx .sc-row.on .sc-t{font:700 24px/1.5 Pretendard,sans-serif;letter-spacing:-.36px;color:#0A0A0A;white-space:normal}
#scx .sc-d{display:block;height:0;overflow:hidden;opacity:0;transition:height .42s cubic-bezier(.2,.8,.2,1),opacity .3s}
#scx .sc-row.on .sc-d{opacity:1;transition:height .42s cubic-bezier(.2,.8,.2,1),opacity .4s .12s}
#scx .sc-d span{display:block;padding-top:8px;font:400 18px/1.65 Pretendard,sans-serif;letter-spacing:-.18px;color:rgba(10,10,10,.75)}
#scx .sc-d span i{display:block;font-style:normal}
#scx .sc-cnt{position:absolute;left:560px;top:233px;display:flex;align-items:flex-end;gap:12px;height:76px}
#scx .sc-cnt svg{display:block}
#scx .sc-tot{padding-bottom:14px;font:500 14px/1.2 Pretendard,sans-serif;letter-spacing:.28px;color:#7A7A7A}
#scx .sc-vid{position:absolute;left:560px;top:337px;width:766px;height:431px;border-radius:30px;overflow:hidden;background:#263038;transform:translateZ(0)}
#scx .sc-vid video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .38s ease;pointer-events:none}
#scx .sc-vid video.on{opacity:1}
#scx .sc-vid video::-webkit-media-controls-start-playback-button{display:none!important;-webkit-appearance:none}
#scx .sc-bar{position:absolute;left:560px;top:796px;width:766px;height:3px;display:flex;gap:5.667px}
#scx .sc-bar i{flex:1 1 0;height:3px;background:#D6D6D6;transition:background-color .3s}
#scx .sc-bar i.past{background:rgba(10,10,10,.35)}
#scx .sc-bar i.on{background:#0A0A0A}
@media (prefers-reduced-motion:reduce){#scx .scs *{transition:none!important}}
`;

// Megascope 숫자(장면 번호): 80px · 행간 0.95 · 자간 +4%
function mega(text, fs, lh, ls, color){
  const s = fs / 1000, base = lh * .861; let x = 0, html = '';
  [...text].forEach((ch, i) => { const g = MEGA.G[ch] || MEGA.G[' '];
    if (g.d) html += '<path transform="translate(' + x.toFixed(2) + ' ' + base.toFixed(2) + ') scale(' + s + ' ' + (-s) + ')" d="' + g.d + '"/>';
    x += g.a * s + (MEGA.K[ch + (text[i + 1] || '')] || 0) * s + (i < text.length - 1 ? ls * fs : 0); });
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', Math.ceil(x)); svg.setAttribute('height', Math.ceil(lh)); svg.setAttribute('fill', color);
  svg.setAttribute('overflow', 'visible'); svg.setAttribute('aria-hidden', 'true'); svg.innerHTML = html; return svg;
}

export function createScenario(stage, {event} = {}){
  if (!document.getElementById('scxCss')) { const st = document.createElement('style'); st.id = 'scxCss'; st.textContent = CSS; document.head.appendChild(st); }
  const root = document.createElement('div'); root.className = 'scs'; stage.appendChild(root);
  root.innerHTML = '<div class="sc-seg" role="tablist" aria-label="시나리오"><i class="sc-pill" aria-hidden="true"></i>'
    + SCENARIOS.map((c, i) => '<button type="button" role="tab" data-s="' + i + '" style="left:' + (4 + i * 138) + 'px">' + c.label + '</button>').join('') + '</div>'
    + '<div class="sc-left"><p class="sc-eye"></p><h2 class="sc-head"></h2><ol class="sc-list"></ol></div>'
    + '<div class="sc-cnt" aria-live="polite"><span class="sc-num-big"></span><span class="sc-tot"></span></div>'
    + '<div class="sc-vid"><video muted playsinline preload="auto" disablepictureinpicture></video><video muted playsinline preload="auto" disablepictureinpicture></video></div>'
    + '<div class="sc-bar" aria-hidden="true"></div>';
  const $ = q => root.querySelector(q);
  const segBtns = [...root.querySelectorAll('.sc-seg button')], pill = $('.sc-pill');
  const eye = $('.sc-eye'), head = $('.sc-head'), list = $('.sc-list'), big = $('.sc-num-big'), tot = $('.sc-tot'), bar = $('.sc-bar');
  const vids = [...root.querySelectorAll('video')];
  vids.forEach(v => { v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('webkit-playsinline', ''); });
  let S = -1, I = -1, front = 0, live = false, rows = [], ticks = [];
  const emit = (n, d) => { if (event) try { event(n, d); } catch {} };

  function buildScenario(s){
    const c = SCENARIOS[s];
    segBtns.forEach((b, i) => { b.classList.toggle('on', i === s); b.setAttribute('aria-selected', i === s ? 'true' : 'false'); });
    pill.style.transform = 'translateX(' + (s * 138) + 'px)';
    eye.textContent = c.eyebrow; head.innerHTML = c.head.map(l => '<span>' + l + '</span>').join('');
    list.innerHTML = c.scenes.map((sc, i) => '<li><button type="button" class="sc-row" data-i="' + i + '"><span class="sc-num">' + pad(i + 1) + '</span><span class="sc-txt"><span class="sc-t">' + sc.t
      + '</span><span class="sc-d"><span>' + sc.d.map(l => '<i>' + l + '</i>').join('') + '</span></span></span></button></li>').join('');
    rows = [...list.querySelectorAll('.sc-row')];
    bar.innerHTML = c.scenes.map(() => '<i></i>').join(''); ticks = [...bar.children];
    tot.textContent = '/ ' + pad(c.scenes.length);
  }
  // 영상 두 장을 번갈아 쓴다: 앞 장이 재생되는 동안 뒤 장에 다음 장면을 미리 받아 두고, 바뀔 때 0.38초 교차 페이드
  function setVideo(s, i){
    const want = src(s, i) + '.mp4';
    let next = vids[1 - front];
    if (!next.src.endsWith(want)) { next.poster = src(s, i) + '.webp'; next.src = want; next.load(); }
    const prev = vids[front]; front = 1 - front;
    try { next.currentTime = 0; } catch {}
    next.classList.add('on'); prev.classList.remove('on');
    setTimeout(() => { if (vids[front] !== prev) { prev.pause(); preload(); } }, 420);
    if (live) play(next);
  }
  function preload(){
    const [ns, ni] = after(S, I), v = vids[1 - front], want = src(ns, ni) + '.mp4';
    if (!v.src.endsWith(want)) { v.poster = src(ns, ni) + '.webp'; v.preload = 'auto'; v.src = want; v.load(); }
  }
  const play = v => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
  const after = (s, i) => i + 1 < SCENARIOS[s].scenes.length ? [s, i + 1] : [(s + 1) % SCENARIOS.length, 0];
  const before = (s, i) => i > 0 ? [s, i - 1] : [(s + SCENARIOS.length - 1) % SCENARIOS.length, SCENARIOS[(s + SCENARIOS.length - 1) % SCENARIOS.length].scenes.length - 1];

  function show(s, i, via){
    if (s === S && i === I) { if (live) play(vids[front]); return; }
    if (s !== S) buildScenario(s);
    S = s; I = i;
    rows.forEach((r, k) => { const on = k === i, d = r.querySelector('.sc-d');
      r.classList.toggle('on', on); r.setAttribute('aria-current', on ? 'step' : 'false');
      d.style.height = on ? d.firstChild.scrollHeight + 'px' : '0px'; });
    ticks.forEach((t, k) => { t.className = k < i ? 'past' : k === i ? 'on' : ''; });
    big.replaceChildren(mega(pad(i + 1), 80, 76, .04, '#0A0A0A'));
    root.setAttribute('aria-label', SCENARIOS[s].label + ' ' + pad(i + 1) + ' / ' + pad(SCENARIOS[s].scenes.length) + ' · ' + SCENARIOS[s].scenes[i].t);
    setVideo(s, i);
    if (via !== 'reset') emit('scenario_scene', {scene:(s + 1) + '-' + (i + 1), via:via || 'tap'});
  }
  // 끝나면 다음 장면(마지막 장면 다음은 다음 시나리오 첫 장면)
  vids.forEach(v => v.addEventListener('ended', () => { if (live && v === vids[front]) { const [ns, ni] = after(S, I); show(ns, ni, 'auto'); } }));

  root.addEventListener('click', e => {
    const b = e.target.closest('.sc-seg button'); if (b) { const s = +b.dataset.s; if (s !== S) show(s, 0, 'segment'); else if (I !== 0) show(s, 0, 'segment'); return; }
    const r = e.target.closest('.sc-row'); if (r) show(S, +r.dataset.i, 'list');
  });
  // 오른쪽(장면 번호·영상·눈금) 스와이프: 위·왼쪽 = 다음, 아래·오른쪽 = 이전. 휠도 같은 방향
  let p0 = null, wheelT = 0;
  root.addEventListener('pointerdown', e => { if (e.clientX === undefined || e.target.closest('button')) { p0 = null; return; } p0 = {x:e.clientX, y:e.clientY, t:performance.now()}; });
  root.addEventListener('pointerup', e => { if (!p0) return; const k = stageScale(), dx = (e.clientX - p0.x) / k, dy = (e.clientY - p0.y) / k; p0 = null;
    const d = Math.abs(dx) > Math.abs(dy) ? dx : dy; if (Math.abs(d) < 48) return;
    step(d < 0 ? 1 : -1, 'swipe'); });
  root.addEventListener('pointercancel', () => { p0 = null; });
  root.addEventListener('wheel', e => { const now = performance.now(); if (now - wheelT < 700 || Math.abs(e.deltaY) < 24) return; wheelT = now; step(e.deltaY > 0 ? 1 : -1, 'wheel'); }, {passive:true});
  const stageScale = () => { const r = root.getBoundingClientRect(); return r.width / 1366 || 1; };
  function step(dir, via){ const [ns, ni] = dir > 0 ? after(S, I) : before(S, I); show(ns, ni, via); }

  return {
    open(s = 0, i = 0){ live = true; if (S < 0 || s !== S || i !== I) show(s, i, 'open'); else play(vids[front]); },
    hide(){ live = false; vids.forEach(v => v.pause()); },
    reset(){ live = false; vids.forEach(v => { v.pause(); }); if (S !== 0 || I !== 0) show(0, 0, 'reset'); },
    state:() => ({scenario:S, scene:I}),
  };
}
