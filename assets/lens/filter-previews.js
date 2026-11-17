// 필터 썸네일: 지금 카메라(또는 샘플) 프레임에 각 오행 색보정을 적용해 보여준다 — 렌즈와 같은 gradeColor
import {gradeColor} from './color-grade.js';
const N = 160;
// W×H: 썸네일 캔버스 크기(Camera 다이얼은 160×160 원형)
export function createFilterPreviews(buttons, strength = .92, W = 160, H = 132){
  const A = strength * 1.2, TA = Math.tan(A);   // 렌즈와 같은 어안 곡선
  const input = document.createElement('canvas'); input.width = input.height = N; const ctx = input.getContext('2d', {willReadFrequently:true}), graded = new Float64Array(3);
  const views = [...buttons].map(button => { let canvas = button.querySelector('canvas.filter-preview');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.className = 'filter-preview'; button.insertBefore(canvas, button.firstChild); }
    canvas.width = W; canvas.height = H; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', button.getAttribute('aria-label') + ' 적용 영상');
    const context = canvas.getContext('2d'); return {element:Number(button.dataset.element), context, image:context.createImageData(W, H)}; });
  const index = new Int32Array(W * H), flat = new Int32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, dx = (x + .5 - W / 2) / (W / 2) * .76, dy = (y + .5 - H / 2) / (W / 2) * .76, r = Math.hypot(dx, dy);
    flat[i] = (Math.max(0, Math.min(N - 1, Math.floor((dy * .5 + .5) * N))) * N + Math.max(0, Math.min(N - 1, Math.floor((dx * .5 + .5) * N)))) * 4;
    if (r > 1) { index[i] = flat[i] = -1; continue; }
    const rs = Math.tan(r * A) / TA, k = r > .00001 ? rs / r : 1, sx = Math.max(0, Math.min(N - 1, Math.floor((dx * k * .5 + .5) * N))), sy = Math.max(0, Math.min(N - 1, Math.floor((dy * k * .5 + .5) * N)));
    index[i] = (sy * N + sx) * 4; }
  let pixels = null, next = 0;
  const grab = source => { ctx.clearRect(0, 0, N, N); ctx.drawImage(source, 0, 0, N, N); pixels = ctx.getImageData(0, 0, N, N).data; };
  const paint = (view, positions) => { const dst = view.image.data;
    for (let i = 0; i < W * H; i++) { const s = positions[i], d = i * 4; if (s < 0) { dst[d] = dst[d + 1] = dst[d + 2] = 0; dst[d + 3] = 255; continue; }
      gradeColor(pixels[s] / 255, pixels[s + 1] / 255, pixels[s + 2] / 255, view.element, 1, graded);
      dst[d] = graded[0] * 255; dst[d + 1] = graded[1] * 255; dst[d + 2] = graded[2] * 255; dst[d + 3] = 255; }
    view.context.putImageData(view.image, 0, 0); };
  return {
    // 전체를 한 번에(샘플 사진 등 정지 화면용)
    render(source, distort = true){ grab(source); for (const view of views) paint(view, distort ? index : flat); },
    // 실시간 카메라용: 호출할 때마다 썸네일 하나만 갱신한다. 한 바퀴를 시작할 때 프레임을 새로 받아 다섯 개가 같은 순간을 보여 준다
    // 다음 renderNext가 새 프레임을 읽는지(한 바퀴의 시작)
    needsFrame(){ return next === 0 || !pixels; },
    renderNext(source, distort = true){ if (!views.length) return; if (next === 0 || !pixels) grab(source); paint(views[next], distort ? index : flat); next = (next + 1) % views.length; }
  };
}
