// Image-space landmarks: glyph composition happens before the fisheye pass.
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function angle(a, b, c){ const u = [a.x - b.x, a.y - b.y, a.z - b.z], v = [c.x - b.x, c.y - b.y, c.z - b.z]; const n = Math.hypot(...u) * Math.hypot(...v);
  return n ? Math.acos(Math.max(-1, Math.min(1, u.reduce((s, x, i) => s + x * v[i], 0) / n))) * 180 / Math.PI : 0; }
export function palmPose(points){
  if (!points || points.length !== 21 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null;
  const p = points.map(p => ({...p, z:p.z || 0}));
  const extended = [5, 9, 13, 17].filter(i => angle(p[i], p[i + 1], p[i + 3]) > 150 && distance(p[i + 3], p[0]) > distance(p[i + 1], p[0]) * 1.1).length;
  const width = distance(p[5], p[17]); if (extended < 3 || width < .045) return null;
  const center = [0, 5, 9, 13, 17].reduce((a, i) => ({x:a.x + p[i].x / 5, y:a.y + p[i].y / 5}), {x:0, y:0});
  return {...center, size:Math.max(.065, Math.min(.38, width * .88)), rotation:Math.atan2(p[9].y - p[0].y, p[9].x - p[0].x) + Math.PI / 2};
}
