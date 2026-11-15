// 필터 썸네일: 지금 카메라(또는 샘플) 프레임에 각 오행 색보정을 적용해 보여준다 — 렌즈와 같은 gradeColor
import {gradeColor} from './color-grade.js';
const W = 160, H = 132, N = 160;
export function createFilterPreviews(buttons){
  const input = document.createElement('canvas'); input.width = input.height = N; const ctx = input.getContext('2d', {willReadFrequently:true}), graded = new Float64Array(3);
  const views = [...buttons].map(button => { let canvas = button.querySelector('canvas.filter-preview');
    if (!canvas) { canvas = document.createElement('canvas'); canvas.className = 'filter-preview'; button.insertBefore(canvas, button.firstChild); }
    canvas.width = W; canvas.height = H; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', button.getAttribute('aria-label') + ' 적용 영상');
    const context = canvas.getContext('2d'); return {element:Number(button.dataset.element), context, image:context.createImageData(W, H)}; });
  const index = new Int32Array(W * H), flat = new Int32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, dx = (x + .5 - W / 2) / (W / 2) * .76, dy = (y + .5 - H / 2) / (W / 2) * .76, r = Math.hypot(dx, dy);
    flat[i] = (Math.max(0, Math.min(N - 1, Math.floor((dy * .5 + .5) * N))) * N + Math.max(0, Math.min(N - 1, Math.floor((dx * .5 + .5) * N)))) * 4;
    if (r > 1) { index[i] = flat[i] = -1; continue; }
    const rs = Math.tan(r * .78) / Math.tan(.78), k = r > .00001 ? rs / r : 1, sx = Math.max(0, Math.min(N - 1, Math.floor((dx * k * .5 + .5) * N))), sy = Math.max(0, Math.min(N - 1, Math.floor((dy * k * .5 + .5) * N)));
    index[i] = (sy * N + sx) * 4; }
  return {render(source, distort = true){
    const positions = distort ? index : flat; ctx.clearRect(0, 0, N, N); ctx.drawImage(source, 0, 0, N, N); const pixels = ctx.getImageData(0, 0, N, N).data;
    for (const view of views) { const dst = view.image.data;
      for (let i = 0; i < W * H; i++) { const s = positions[i], d = i * 4; if (s < 0) { dst[d] = dst[d + 1] = dst[d + 2] = 0; dst[d + 3] = 255; continue; }
        gradeColor(pixels[s] / 255, pixels[s + 1] / 255, pixels[s + 2] / 255, view.element, 1, graded);
        dst[d] = graded[0] * 255; dst[d + 1] = graded[1] * 255; dst[d + 2] = graded[2] * 255; dst[d + 3] = 255; }
      view.context.putImageData(view.image, 0, 0); } }};
}
