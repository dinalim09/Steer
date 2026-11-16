// 손바닥 여러 개 추적(최대 MAX_HANDS). MediaPipe가 돌려주는 손 순서는 프레임마다 바뀔 수 있으므로,
// 순서가 아니라 위치로 이전 프레임의 손과 짝지어 같은 손에 같은 스티커가 계속 붙도록 한다.
//  · 짝짓기: 모든 조합 중 이동 거리(손바닥 크기로 나눈 값) 합이 가장 작은 조합 → 두 손이 가까워도 서로 바뀌어 붙지 않는다
//  · 손이 사라지면 그 손의 스티커만 HOLD 동안 유지했다가 서서히 사라진다. 다른 손은 영향을 받지 않는다
//  · 양손을 내민 한 사람 · 두 사람 모두 같은 방식(손 단위)으로 처리한다
export const MAX_HANDS = 2;
const HOLD = 400;          // 마지막 감지 후 스티커 유지 시간(ms) — 기존 한 손 추적과 같은 값
const MATCH = 2.6;         // 손바닥 크기 기준 최대 이동 거리. 넘으면 다른 손으로 본다
const REUSE = 150;         // 슬롯이 가득 찼을 때, 이만큼 감지되지 않은 손의 슬롯은 새 손에 넘긴다(ms)
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const gap = (t, p) => Math.hypot(t.x - p.x, t.y - p.y) / Math.max(.08, (t.size + p.size) / 2);

export function createTracks(){
  let tracks = [], nextId = 1;
  // poses: 이번 추론에서 손바닥으로 판정된 손들(palmPose 결과, null 제외)
  function update(poses, now){
    const P = (poses || []).filter(Boolean).slice(0, MAX_HANDS), T = tracks;
    let best = null;
    const walk = (i, used, cost, map) => {
      if (i === P.length) { if (!best || cost < best.cost) best = {cost, map:map.slice()}; return; }
      for (let j = 0; j < T.length; j++) {
        if (used & (1 << j)) continue;
        const d = gap(T[j].target || T[j], P[i]);
        if (d < MATCH) { map.push(j); walk(i + 1, used | (1 << j), cost + d, map); map.pop(); }
      }
      map.push(-1); walk(i + 1, used, cost + MATCH, map); map.pop();
    };
    walk(0, 0, 0, []);
    const taken = new Set(best.map.filter(j => j >= 0));
    best.map.forEach((j, i) => {
      const p = P[i];
      if (j >= 0) { T[j].target = p; T[j].seen = now; return; }
      if (tracks.length < MAX_HANDS) { tracks.push({id:nextId++, x:p.x, y:p.y, size:p.size, rotation:p.rotation, a:0, target:p, seen:now}); return; }
      // 슬롯이 가득 찼다면, 이번에 짝지어지지 않았고 잠시 감지되지 않은 손의 슬롯을 새 손 위치로 옮긴다
      const k = tracks.map((t, idx) => idx).filter(idx => !taken.has(idx) && now - tracks[idx].seen > REUSE).sort((a, b) => tracks[a].seen - tracks[b].seen)[0];
      if (k !== undefined) { taken.add(k); Object.assign(tracks[k], {id:nextId++, x:p.x, y:p.y, size:p.size, rotation:p.rotation, a:0, target:p, seen:now}); }
    });
  }
  // 매 프레임: 각 손을 목표 위치로 부드럽게 따라가고, 감지가 끊긴 손은 서서히 지운다
  function step(now){
    for (const t of tracks) {
      const g = t.target;
      if (g && now - t.seen < HOLD) {
        t.x += (g.x - t.x) * .45; t.y += (g.y - t.y) * .45; t.size += (g.size - t.size) * .35;
        t.rotation += wrap(g.rotation - t.rotation) * .35; t.a = Math.min(1, t.a + .25);
      } else t.a -= .2;
    }
    tracks = tracks.filter(t => t.a > 0 || (t.target && now - t.seen < HOLD));
    return tracks;
  }
  const active = now => tracks.some(t => t.target && now - t.seen < HOLD);
  const reset = () => { tracks = []; };
  return {update, step, active, reset, get list(){ return tracks; }};
}
