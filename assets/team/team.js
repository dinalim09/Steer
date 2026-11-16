// STEER Team — 메인(시계 · Figma 3967:3442)과 팀원 개인 페이지(엔딩 크레딧 · Figma 3967:3331)
// 시계는 CSS transform 애니메이션만 쓴다(매 프레임 JS 계산·rAF 없음). 사진·숫자 버튼은 Figma 위치에 고정되고,
// 바늘 3개만 피벗을 기준으로 돌며 사진 위를 가로질러 지나간다(바늘은 pointer-events:none이라 터치를 가로채지 않는다).
import MEGA from './mega.js';
import {PIVOT, PERIOD, HANDS, MEMBERS, SPECIAL_THANKS, CREDIT_PLACEHOLDER_LINES} from './team-data.js';

const BASE = new URL('./', import.meta.url).href;
const NS = 'http://www.w3.org/2000/svg';
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const CREDIT_SPEED = 65;      // 크레딧·프로필 사진이 함께 올라가는 속도(px/s, 일정한 선형)
const CREDIT_DELAY = 1.4;     // 사진·제목이 나온 뒤 크레딧이 움직이기 시작할 때까지(초)
const CREDIT_GAP = 160;       // 반복할 때 마지막 줄(Special Thanks 이름)과 다음 회차 첫 줄 사이 간격(px)
const PHOTO_PITCH = 170;      // 괄호 창 안에서 이어지는 프로필 사진 사이 간격의 목표값(px) — 크레딧 반복 주기에 맞춰 조정된다
const SLOT = {x:160, y:563, w:400, h:144};   // 'Who Made ( ) This'의 괄호 안쪽 창(사진이 지나가는 영역). 괄호 글자 높이와 같다

const CSS = `
#tmx .tms{position:absolute;inset:0;overflow:hidden;background:#fff;color:#0A0A0A}
#tmx .tm-v{position:absolute;inset:0;visibility:hidden}
#tmx .tm-v.on{visibility:visible}
#tmx .tm-abs{position:absolute;display:block;max-width:none}
#tmx .tm-clock{position:absolute;inset:0;pointer-events:none}
#tmx .tm-arm{position:absolute;width:0;height:0;will-change:transform;pointer-events:none}
#tmx .tm-hand{position:absolute;display:block;pointer-events:none}
#tmx .tm-mb{position:absolute;padding:0;margin:0;border:0;background:none;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#tmx .tm-mb:focus-visible{outline:3px solid #87E6FF;outline-offset:4px;border-radius:6px}
#tmx .tm-mbi{position:absolute;inset:0;transition:transform .15s ease}
#tmx .tm-mb.press .tm-mbi{transform:scale(.96)}
#tmx .tm-mb img{position:absolute;display:block;max-width:none;pointer-events:none;-webkit-user-drag:none}
#tmx .tm-mb svg{position:absolute;display:block;pointer-events:none}
#tmx .tm-run .tm-arm{animation:var(--spin) var(--T) linear var(--dl,0s) infinite}
#tmx .tm-back{position:absolute;left:28px;top:139px;width:63px;height:64px;padding:0 18px 0 23px;border:0;margin:0;background:none;display:flex;align-items:center;cursor:pointer;color:#0A0A0A;font:500 16px/1 'Pretendard',PretT,'Noto Sans KR',sans-serif;-webkit-tap-highlight-color:transparent;touch-action:manipulation;transition:transform .15s ease;border-radius:14px}
#tmx .tm-back.press{transform:scale(.96)}
#tmx .tm-back:focus-visible{outline:3px solid #87E6FF;outline-offset:2px}
#tmx .tm-back svg{display:block;flex:none}
#tmx .tm-cr{position:absolute;left:683px;top:286px;width:420px;height:738px;overflow:hidden;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 34px,#000 calc(100% - 48px),transparent);mask-image:linear-gradient(180deg,transparent 0,#000 34px,#000 calc(100% - 48px),transparent)}
#tmx .tm-cri{position:absolute;left:0;top:0;width:100%;will-change:transform}
#tmx .tm-crb{position:absolute;left:0;width:100%}
#tmx .tm-slot{position:absolute;overflow:hidden;-webkit-mask-image:linear-gradient(180deg,transparent 0,#000 12px,#000 calc(100% - 12px),transparent);mask-image:linear-gradient(180deg,transparent 0,#000 12px,#000 calc(100% - 12px),transparent)}
#tmx .tm-strip{position:absolute;left:0;top:0;width:100%;will-change:transform}
#tmx .tm-st{position:absolute;left:0;margin:0;font:400 24px/52px 'Pretendard',PretT,'Noto Sans KR',sans-serif;white-space:nowrap}
#tmx .tm-ph{opacity:.26}
#tmx .tm-icon{position:absolute;width:42px;height:42px;display:block}
@media (prefers-reduced-motion:reduce){
  #tmx .tm-arm{animation:none!important}
  #tmx .tm-cr{overflow-y:auto;-webkit-overflow-scrolling:touch}
  #tmx .tm-crb+.tm-crb,#tmx .tm-strip img+img{display:none}
}`;

// Megascope 글자: lines 배열을 box 너비 안에 정렬해 SVG 하나로(fs 글자 크기, lh 행간, base 첫 기준선, ls 자간 em)
function mega(lines, fs, lh, base, ls, color, align = 'left', boxW = 0){
  const s = fs / 1000, svg = document.createElementNS(NS, 'svg'); let html = '', maxW = 0;
  const widths = lines.map(ln => { let x = 0; [...ln].forEach((ch, i) => { const g = MEGA.G[ch] || MEGA.G[' ']; x += g.a * s + (MEGA.K[ch + (ln[i + 1] || '')] || 0) * s + (i < ln.length - 1 ? ls * fs : 0); }); return x; });
  const W = Math.max(boxW, ...widths);
  lines.forEach((ln, li) => {
    let x = align === 'center' ? (W - widths[li]) / 2 : align === 'right' ? W - widths[li] : 0; const y = base + li * lh;
    [...ln].forEach((ch, i) => { const g = MEGA.G[ch] || MEGA.G[' '];
      if (g.d) html += '<path transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') scale(' + s + ' ' + (-s) + ')" d="' + g.d + '"/>';
      x += g.a * s + (MEGA.K[ch + (ln[i + 1] || '')] || 0) * s + ls * fs; });
    maxW = Math.max(maxW, widths[li]); });
  svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('fill', color); svg.setAttribute('overflow', 'visible');
  svg.setAttribute('width', Math.ceil(W)); svg.setAttribute('height', Math.ceil(base + (lines.length - 1) * lh + .3 * fs));
  svg.innerHTML = html; svg.dataset.w = maxW.toFixed(1); return svg;
}
// 화면 밖 빠른 통과: 각 바늘 끝점(피벗에서 along + length/2, 바늘 폭의 양 모서리)이 화면(1366×1024) 밖에 완전히 나가 있는
// 회전 각도 구간을 Figma 피벗·바늘 길이·초기 각도로 미리 계산하고, 그 구간만 1.2~1.5초에 지나가도록 keyframes 시간을 나눈다.
// 구간 양 끝 속도는 평소 속도와 같게(cubic-bezier 끝 기울기 = 평소 속도) 해서 가속·감속이 끊김 없이 이어진다.
const VW = 1366, VH = 1024;
function tipOffRange(h){
  const R = h.along + h.length / 2, hw = h.width / 2;
  const out = (x, y) => x < 0 || x > VW || y < 0 || y > VH;
  const off = d => { const r = (h.angle + d) * Math.PI / 180, s = Math.sin(r), c = Math.cos(r);   // 끝 방향 = (sin, -cos)
    const X = PIVOT.x + R * s, Y = PIVOT.y - R * c;
    return out(X + hw * c, Y + hw * s) && out(X - hw * c, Y - hw * s); };
  let a = null, b = null;
  for (let i = 0; i <= 3600; i++) { const d = i / 10, o = off(d); if (o && a === null) a = d; if (!o && a !== null && b === null) { b = d; break; } }
  return a !== null && b !== null ? [a, b] : null;   // 회전 0°(Figma 배치)는 바늘 끝이 화면 안
}
function spinPlan(k){
  const T = PERIOD[k], w = 360 / T, r = tipOffRange(HANDS[k]);
  const fast = 1.2 + .3 * (T - 30) / 150;              // 화면 밖 구간 통과 시간(초): 초침 1.2 · 분침 1.32 · 시침 1.5
  if (!r || (r[1] - r[0]) / w <= fast) return {T, css:'@keyframes tmS-' + k + '{to{transform:rotate(360deg)}}', range:r, cycle:T};
  const [a, b] = r, D = b - a, cycle = T - D / w + fast, ta = (a / w) / cycle * 100, tb = (a / w + fast) / cycle * 100;
  const kk = w * fast / D, ez = 'cubic-bezier(.33,' + (.33 * kk).toFixed(4) + ',.67,' + (1 - .33 * kk).toFixed(4) + ')';
  const kf = '0%{transform:rotate(0deg);animation-timing-function:linear}' + ta.toFixed(4) + '%{transform:rotate(' + a + 'deg);animation-timing-function:' + ez + '}' + tb.toFixed(4) + '%{transform:rotate(' + b + 'deg);animation-timing-function:linear}100%{transform:rotate(360deg)}';
  return {T, range:r, cycle, css:'@keyframes tmS-' + k + '{' + kf + '}'};
}
const at = (el, x, y, extra) => { el.classList.add('tm-abs'); Object.assign(el.style, {left:x + 'px', top:y + 'px'}, extra || {}); return el; };
const img = (src, x, y, w, h, alt = '') => { const i = new Image(); i.src = BASE + src; i.alt = alt; i.decoding = 'async'; i.draggable = false; return at(i, x, y, {width:w + 'px', height:h + 'px'}); };

export function createTeam(stage, hooks = {}){
  if (!document.getElementById('tm-css')) { const st = document.createElement('style'); st.id = 'tm-css'; st.textContent = CSS; document.head.appendChild(st); }
  stage.classList.add('tms');
  const main = document.createElement('div'), mem = document.createElement('div');
  main.className = 'tm-v tm-main'; mem.className = 'tm-v tm-mem';
  main.setAttribute('role', 'region'); main.setAttribute('aria-label', 'Team Steer'); mem.setAttribute('role', 'region');
  stage.append(main, mem);

  // ---------- 메인 ----------
  const title = mega(['Team ‘Steer’'], 96, 91.2, 78.52, .04, '#0A0A0A');
  main.appendChild(at(title, 40, 122)); title.setAttribute('role', 'img'); title.setAttribute('aria-label', 'Team ‘Steer’');
  // 쌓임: 사진·숫자 버튼(아래) → 바늘(위). 바늘이 사진 위를 지나가도 터치는 아래 버튼에 전달된다
  const mbs = document.createElement('div'); mbs.className = 'tm-mbs'; main.appendChild(mbs);
  const clock = document.createElement('div'); clock.className = 'tm-clock'; clock.setAttribute('aria-hidden', 'true'); main.appendChild(clock);
  const arms = {};
  // 쌓임 순서는 Figma 레이어 순서(짧은 검정 → 긴 검정 → 하늘색이 맨 위)
  for (const k of ['hour', 'minute', 'second']) { const h = HANDS[k];
    const arm = document.createElement('div'); arm.className = 'tm-arm'; arm.dataset.hand = k;
    Object.assign(arm.style, {left:PIVOT.x + 'px', top:PIVOT.y + 'px'});
    const hand = document.createElement('i'); hand.className = 'tm-hand';
    const top = h.along + h.length / 2;
    Object.assign(hand.style, {left:(-h.width / 2) + 'px', top:(-top) + 'px', width:h.width + 'px', height:h.length + 'px', background:h.color,
      transformOrigin:(h.width / 2) + 'px ' + top + 'px', transform:'rotate(' + h.angle + 'deg)'});
    arm.appendChild(hand); clock.appendChild(arm); arms[k] = arm;
  }
  // 바늘별 회전 계획(바늘 끝이 화면 밖인 구간 가속) — 한 번만 계산해 keyframes로 넣는다
  const plans = {}; let kcss = '';
  for (const k of Object.keys(HANDS)) {
    const pl = spinPlan(k); plans[k] = pl; kcss += pl.css;
    arms[k].style.setProperty('--T', pl.cycle.toFixed(3) + 's'); arms[k].style.setProperty('--spin', 'tmS-' + k);
  }
  const kst = document.getElementById('tm-kf') || document.head.appendChild(Object.assign(document.createElement('style'), {id:'tm-kf'})); kst.textContent = kcss;
  // 사진·숫자 = 한 버튼(같은 목적지). Figma 위치에 고정, 터치해도 바늘은 계속 돈다
  const btns = MEMBERS.map(m => {
    const lb = m.labelBox, pb = m.photoBox, x0 = Math.min(lb.x, pb.x), y0 = Math.min(lb.y, pb.y), x1 = Math.max(lb.x + lb.w, pb.x + 120), y1 = pb.y + 126;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tm-mb'; b.dataset.id = m.id;
    b.setAttribute('aria-label', (m.name || '팀원 ' + m.id) + ' 개인 페이지 ' + m.label.replace('3o', '30'));
    Object.assign(b.style, {left:x0 + 'px', top:y0 + 'px', width:(x1 - x0) + 'px', height:(y1 - y0) + 'px'});
    const inner = document.createElement('span'); inner.className = 'tm-mbi';
    const ph = new Image(); ph.src = BASE + m.photoBlur; ph.alt = ''; ph.decoding = 'async'; ph.draggable = false;
    Object.assign(ph.style, {left:(pb.x - x0 - 8) + 'px', top:(pb.y - y0 - 8) + 'px', width:'136px', height:'142px'});   // 흐림 번짐 여백 8px 포함
    const lab = mega([m.label], 30, 37, 28.8, .04, '#000000', lb.align, lb.w);
    Object.assign(lab.style, {left:(lb.x - x0) + 'px', top:(lb.y - y0) + 'px'});
    inner.append(ph, lab); b.appendChild(inner); mbs.appendChild(b);
    const release = () => b.classList.remove('press');
    b.addEventListener('pointerdown', e => { b.classList.add('press'); try { b.setPointerCapture(e.pointerId); } catch {} });
    b.addEventListener('pointerup', () => b.classList.remove('press'));
    b.addEventListener('pointercancel', release);
    b.addEventListener('lostpointercapture', () => setTimeout(() => { if (!b.classList.contains('nav')) release(); }, 0));
    b.addEventListener('click', () => { if (b.classList.contains('nav')) return; b.classList.add('nav'); setTimeout(() => { b.classList.remove('nav'); release(); }, 400); hooks.onMember && hooks.onMember(m.id); });
    return b;
  });

  // ---------- 개인 페이지 ----------
  let anims = [];
  const stopMember = () => { anims.forEach(a => a.cancel()); anims = []; };
  function buildMember(m){
    stopMember(); mem.textContent = ''; mem.setAttribute('aria-label', (m.name || '팀원 ' + m.id) + ' 개인 페이지');
    // ← 뒤로(Figma 좌측 상단 chevron 자리). 화면 낭독용 이름은 aria-label 'Back to Team'
    const back = document.createElement('button'); back.type = 'button'; back.className = 'tm-back'; back.setAttribute('aria-label', 'Back to Team');
    back.innerHTML = '<svg width="22" height="38" viewBox="-3 -3 22 38" fill="none" aria-hidden="true"><path d="M16 0L0 16L16 32" stroke="#0A0A0A" stroke-width="5.333" stroke-linecap="round" stroke-linejoin="round"/></svg>';   // 글자 없이 화살표만(위치·크기 그대로, 터치 영역 63×64)
    back.addEventListener('pointerdown', () => back.classList.add('press')); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => back.addEventListener(t, () => back.classList.remove('press')));
    back.addEventListener('click', () => hooks.onBack && hooks.onBack());
    mem.appendChild(back);
    const star = img('star.webp', 113.7, 486.4, 59, 52.5); mem.appendChild(star);
    const who = mega(['Who', 'Made', '(              )', 'This'], 154.918, 138, 123.2, .03, '#000000', 'center', 447);
    who.setAttribute('role', 'img'); who.setAttribute('aria-label', 'Who Made This'); mem.appendChild(at(who, 142.76, 290));
    // 프로필 사진: 괄호 창(SLOT) 안에서 크레딧과 같은 속도로 위로 흐른다. 같은 사진 2장(원본 + 복제 1장)을 한 번만 만들어 띠로 반복
    const slot = document.createElement('div'); slot.className = 'tm-slot';
    Object.assign(slot.style, {left:SLOT.x + 'px', top:SLOT.y + 'px', width:SLOT.w + 'px', height:SLOT.h + 'px'});
    const strip = document.createElement('div'); strip.className = 'tm-strip'; slot.appendChild(strip);
    const photo = img(m.photo, 305.77 - SLOT.x, 575 - SLOT.y, 120, 126, (m.name || '팀원 ' + m.id) + ' 프로필 사진'); strip.appendChild(photo);
    const photo2 = photo.cloneNode(); photo2.alt = ''; photo2.setAttribute('aria-hidden', 'true'); strip.appendChild(photo2);
    mem.appendChild(slot);
    // 이름 + 메일 · 비핸스 아이콘(이름 끝에서 29px 뒤, Figma 간격)
    const nm = mega([m.name || 'Name TBD'], 100, 138, 104, .03, '#000000');
    if (!m.name) nm.classList.add('tm-ph'); nm.setAttribute('role', 'img'); nm.setAttribute('aria-label', m.name || '이름 미정');
    mem.appendChild(at(nm, 683, 102));
    const iconX = 683 + parseFloat(nm.dataset.w) + 29;
    [['mail', 'ic-mail.webp', '메일'], ['behance', 'ic-be.webp', 'Behance']].forEach(([k, src, lab], i) => {
      const url = m.links && m.links[k];
      const el = url ? Object.assign(document.createElement('a'), {href:url, target:'_blank', rel:'noopener'}) : document.createElement('span');
      el.className = 'tm-icon'; el.setAttribute('aria-label', lab + (url ? '' : ' (주소 미정)'));
      el.style.left = (iconX + i * 49) + 'px'; el.style.top = '150px';
      el.innerHTML = '<img src="' + BASE + src + '" alt="" width="42" height="42" draggable="false">'; mem.appendChild(el);
    });
    (m.cutouts || []).forEach(c => mem.appendChild(img(c.src, c.x, c.y, c.w, c.h)));
    // 크레딧(역할 → Special Thanks to → 이름들). 마스크 영역 안에서 아래→위로 올라간다
    const cr = document.createElement('div'); cr.className = 'tm-cr'; const ci = document.createElement('div'); ci.className = 'tm-cri'; cr.appendChild(ci);
    const blk = document.createElement('div'); blk.className = 'tm-crb'; ci.appendChild(blk);
    const OFF = 303 - 286; let y = OFF;
    const lines = m.credits && m.credits.length ? m.credits : Array.from({length:CREDIT_PLACEHOLDER_LINES}, () => 'Credit TBD');
    const roles = mega(lines, 50, 60, 47.5, .03, '#000000'); if (!(m.credits && m.credits.length)) roles.classList.add('tm-ph');
    roles.setAttribute('role', 'img'); roles.setAttribute('aria-label', m.credits && m.credits.length ? m.credits.join(', ') : '크레딧 미정');
    blk.appendChild(at(roles, 0, y)); y += lines.length * 60 + 30;
    const st = document.createElement('p'); st.className = 'tm-st'; st.textContent = 'Special Thanks to'; st.style.top = y + 'px'; blk.appendChild(st); y += 52 + 10;
    const th = mega(SPECIAL_THANKS, 40, 45, 36.5, .03, '#000000'); th.setAttribute('role', 'img'); th.setAttribute('aria-label', SPECIAL_THANKS.join(', '));
    blk.appendChild(at(th, 0, y)); y += SPECIAL_THANKS.length * 45 + 24;
    // 반복용 복제 1벌(한 번만 생성): 원본 바로 아래 CREDIT_GAP 뒤에 둔다
    const pitch = y + CREDIT_GAP; blk.style.height = y + 'px';
    const blk2 = blk.cloneNode(true); blk2.style.top = pitch + 'px'; blk2.setAttribute('aria-hidden', 'true'); ci.appendChild(blk2);
    ci.style.height = (RM.matches ? y : pitch + y) + 'px'; mem.appendChild(cr);   // 움직임 줄이기에서는 복제본 없이 원본만 스크롤
    // 사진 간격은 크레딧 반복 주기를 정수로 나눈 값 → 두 반복이 같은 주기로 맞물린다
    const pp = pitch / Math.max(1, Math.round(pitch / PHOTO_PITCH)); photo2.style.top = (575 - SLOT.y + pp) + 'px';
    return {back, who, photo, strip, nm, star, cr, ci, contentH:y, pitch, photoPitch:pp};
  }
  function playMember(p){
    if (RM.matches) return;   // 움직임 줄이기: 크레딧은 제자리(스크롤로 읽기), 사진은 Figma 위치에 고정
    const E = 'cubic-bezier(.2,.7,.2,1)';
    // 사진은 발랄하게 살짝 튀며, 'Who Made This'는 아래에서 떠오르며 등장
    anims.push(p.who.animate([{opacity:0, transform:'translateY(26px)'}, {opacity:1, transform:'none'}], {duration:700, easing:E, fill:'backwards'}));
    anims.push(p.photo.animate([{opacity:0, transform:'scale(.6) rotate(-10deg)'}, {opacity:1, transform:'scale(1.08) rotate(4deg)', offset:.65}, {opacity:1, transform:'none'}], {duration:760, delay:260, easing:'ease-out', fill:'backwards'}));
    anims.push(p.star.animate([{opacity:0, transform:'rotate(-90deg) scale(.4)'}, {opacity:1, transform:'none'}], {duration:700, delay:380, easing:E, fill:'backwards'}));
    anims.push(p.nm.animate([{opacity:0, transform:'translateY(-12px)'}, {opacity:p.nm.classList.contains('tm-ph') ? .26 : 1, transform:'none'}], {duration:600, delay:160, easing:E, fill:'backwards'}));
    // 엔딩 크레딧(무한 반복): ① 마스크 아래에서 출발해 Figma 위치(0)까지 올라오고 ② 이어서 한 벌 간격(pitch)만큼 계속 올라가며 반복한다.
    // ②의 끝 상태는 복제본이 원본 자리에 온 모습과 같아 이음매 없이 이어진다. 타이머 없이 Web Animations 두 개(진입·반복)만 쓴다.
    const H = p.cr.clientHeight, v = CREDIT_SPEED / 1000, t0 = CREDIT_DELAY * 1000, entry = H / v;
    anims.push(p.ci.animate([{transform:'translateY(' + H + 'px)'}, {transform:'translateY(0px)'}], {duration:entry, delay:t0, easing:'linear', fill:'both'}));
    anims.push(p.ci.animate([{transform:'translateY(0px)'}, {transform:'translateY(' + (-p.pitch) + 'px)'}], {duration:p.pitch / v, delay:t0 + entry, easing:'linear', iterations:Infinity}));
    // 프로필 사진: 크레딧이 움직이기 시작할 때 같은 속도로 위로 흐르기 시작(괄호 창 밖은 가려짐). 주기는 크레딧 반복 주기의 정수분의 1
    anims.push(p.strip.animate([{transform:'translateY(0px)'}, {transform:'translateY(' + (-p.photoPitch) + 'px)'}], {duration:p.photoPitch / v, delay:t0, easing:'linear', iterations:Infinity}));
  }

  // ---------- 화면 전환 ----------
  let view = null;
  // 시계 연속성: Team에 들어온 시각(clockT0)부터 흐른 시간만큼 앞선 각도에서 다시 돌린다(음수 animation-delay).
  // 개인 페이지에서는 시계가 보이지 않으므로 애니메이션을 멈춰 두고, 돌아오면 그동안 계속 돈 것처럼 이어진다. Team을 닫으면 처음부터.
  let clockT0 = null;
  const markT0 = () => { if (clockT0 === null) clockT0 = performance.now(); };
  const restartClock = () => {
    clock.classList.remove('tm-run'); btns.forEach(b => b.classList.remove('press', 'nav')); markT0();
    const el = (performance.now() - clockT0) / 1000;
    for (const k in arms) arms[k].style.setProperty('--dl', (-(el % plans[k].cycle)).toFixed(3) + 's');
    void clock.offsetWidth; clock.classList.add('tm-run');
  };
  return {
    showMain(){ stopMember(); mem.classList.remove('on'); main.classList.add('on'); restartClock(); view = 'main'; },
    showMember(id){
      const m = MEMBERS.find(x => x.id === id); if (!m) return false;
      markT0(); clock.classList.remove('tm-run'); main.classList.remove('on');
      const p = buildMember(m); mem.classList.add('on'); playMember(p); view = 'member:' + id; return true;
    },
    hide(){ clock.classList.remove('tm-run'); clockT0 = null; stopMember(); main.classList.remove('on'); mem.classList.remove('on'); mem.textContent = ''; view = null; },
    view:() => view, members:MEMBERS.map(m => m.id), plans:() => plans
  };
}
