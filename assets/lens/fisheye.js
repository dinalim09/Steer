// Luck Lens 어안 렌더러 (WebGL, 실패하면 Canvas 2D). 색보정은 color-grade.js와 같은 식을 쓴다.
import {gradeGLSL, gradeColor} from './color-grade.js';
const N = 512;
// settings.element(현재) · settings.from(이전) · settings.t(0→1 전환 진행)로 두 색보정을 섞는다. -1(helm)은 보정 없음.
export function grades(s){ const t = s.t == null ? 1 : s.t, from = s.from == null ? s.element : s.from;
  return [Math.max(0, from), from < 0 ? 0 : s.amount, Math.max(0, s.element), s.element < 0 ? 0 : s.amount, t]; }
export function createFisheye(initialCanvas){
  let canvas = initialCanvas;
  try { return makeWebGL(canvas); } catch { const fresh = canvas.cloneNode(); canvas.replaceWith(fresh); canvas = fresh; return makeCPU(canvas); }
}
function makeWebGL(canvas){
  const gl = canvas.getContext('webgl', {alpha:true, antialias:false, preserveDrawingBuffer:true}); if (!gl) throw Error('WebGL unavailable');
  const compile = (type, text) => { const shader = gl.createShader(type); gl.shaderSource(shader, text); gl.compileShader(shader); if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader)); return shader; };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 position;varying vec2 uv;void main(){uv=(position+1.)*.5;gl_Position=vec4(position,0.,1.);}'));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `precision highp float;varying vec2 uv;uniform sampler2D frame;uniform sampler2D sticker;uniform float elemA;uniform float amtA;uniform float elemB;uniform float amtB;uniform float mixT;uniform float power;${gradeGLSL}
void main(){vec2 p=uv*2.-1.;float r=length(p);if(r>1.){gl_FragColor=vec4(0.);return;}float a=power*1.2;float rs=a<.001?r:tan(r*a)/tan(a);vec2 q=(r>.00001?p*rs/r:p)*.5+.5;vec3 rgb=texture2D(frame,q).rgb;rgb=mix(gradeColor(rgb,elemA,amtA),gradeColor(rgb,elemB,amtB),mixT);vec4 ink=texture2D(sticker,q);gl_FragColor=vec4(mix(rgb,ink.rgb,ink.a),1.-smoothstep(.992,1.,r));}`));
  gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program)); gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const textures = [0, 1].map(unit => { const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    for (const [key, value] of [[gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE], [gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR]]) gl.texParameteri(gl.TEXTURE_2D, key, value); return tex; });
  gl.uniform1i(gl.getUniformLocation(program, 'frame'), 0); gl.uniform1i(gl.getUniformLocation(program, 'sticker'), 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  const U = n => gl.getUniformLocation(program, n), power = U('power'), eA = U('elemA'), aA = U('amtA'), eB = U('elemB'), aB = U('amtB'), mT = U('mixT');
  return {canvas, type:'webgl', render(frame, sticker, settings){
    gl.viewport(0, 0, N, N); gl.uniform1f(power, settings.strength); const g = grades(settings); gl.uniform1f(eA, g[0]); gl.uniform1f(aA, g[1]); gl.uniform1f(eB, g[2]); gl.uniform1f(aB, g[3]); gl.uniform1f(mT, g[4]);
    [frame, sticker].forEach((image, i) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, textures[i]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }};
}
function makeCPU(canvas){
  const ctx = canvas.getContext('2d'), image = ctx.createImageData(N, N), count = N * N, index = new Int32Array(count), fx = new Float32Array(count), fy = new Float32Array(count), graded = new Float64Array(3); let previous = -1;
  function map(strength){ const a = strength * 1.2, den = Math.tan(a);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, dx = (x + .5) / 256 - 1, dy = (y + .5) / 256 - 1, r = Math.hypot(dx, dy); if (r > 1) { index[i] = -1; continue; }
      const rs = a < .001 ? r : Math.tan(r * a) / den, k = r > 1e-8 ? rs / r : 1, sx = Math.max(0, Math.min(510.999, (dx * k * .5 + .5) * N - .5)), sy = Math.max(0, Math.min(510.999, (dy * k * .5 + .5) * N - .5));
      index[i] = (Math.floor(sy) * N + Math.floor(sx)) * 4; fx[i] = sx % 1; fy[i] = sy % 1; }
    previous = strength; }
  return {canvas, type:'canvas2d', render(frame, sticker, settings){
    if (previous !== settings.strength) map(settings.strength);
    const src = frame.getContext('2d').getImageData(0, 0, N, N).data, ink = sticker.getContext('2d').getImageData(0, 0, N, N).data, dst = image.data, g = grades(settings), g2 = new Float64Array(3);
    for (let i = 0; i < count; i++) { const s = index[i], d = i * 4; if (s < 0) { dst[d + 3] = 0; continue; }
      const w0 = (1 - fx[i]) * (1 - fy[i]), w1 = fx[i] * (1 - fy[i]), w2 = (1 - fx[i]) * fy[i], w3 = fx[i] * fy[i];
      const sample = (a, c) => a[s + c] * w0 + a[s + 4 + c] * w1 + a[s + 2048 + c] * w2 + a[s + 2052 + c] * w3;
      const alpha = sample(ink, 3) / 255; const r0 = sample(src, 0) / 255, r1 = sample(src, 1) / 255, r2 = sample(src, 2) / 255; gradeColor(r0, r1, r2, g[2], g[3], graded); if (g[4] < 1) { gradeColor(r0, r1, r2, g[0], g[1], g2); for (let c = 0; c < 3; c++) graded[c] = g2[c] + (graded[c] - g2[c]) * g[4]; }
      for (let c = 0; c < 3; c++) dst[d + c] = graded[c] * 255 * (1 - alpha) + sample(ink, c) * alpha; dst[d + 3] = 255; }
    ctx.putImageData(image, 0, 0); }};
}
