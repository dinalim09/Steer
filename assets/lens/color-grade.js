// Luck Lens 오행 색보정 v2 — 채도(Saturation) · 틴트(Tint) · 색온도(Temperature) 중심.
// 단색 오버레이나 hue 회전 없이, 색 차이는 주로 배경 · 그림자 · 중간톤 · 하이라이트와 전체 색온도에서 드러나게 한다.
// 피부(YCbCr 범위)로 판단되는 픽셀은 화이트밸런스 · 틴트를 크게 덜 받고, 채도는 살짝만 올린다 → 혈색 · 명암 · 입체감 유지.
// GLSL(실시간 미리보기 · 촬영)과 JS(필터 썸네일 · CPU 대체 경로)가 같은 식을 쓰므로 미리보기와 결과 색감이 같다.
//
// 요소 순서: 0 木 · 1 火 · 2 土 · 3 金 · 4 水
// temp: +따뜻 / −차갑게(R·B 게인), tint: +마젠타 / −그린(G 게인), sat: 비피부 채도, skinSat: 피부 채도,
// sh · mid · hi: 그림자 · 중간톤 · 하이라이트에 더하는 색(밝기 0 균형으로 보정해 명암을 바꾸지 않음),
// contrast · exposure: 톤 곡선(金은 또렷하고 밝게)
export const PROFILES = [
  {temp:-.06, tint:-.10, sat:1.30, skinSat:1.06, sh:[-.020, .055, .030], mid:[-.030, .050, -.005], hi:[.010, .035, -.030], contrast:1.04, exposure:1.00},   // 木 산뜻한 그린
  {temp: .12, tint: .05, sat:1.26, skinSat:1.04, sh:[.060, -.020, .010], mid:[.055, .005, -.020], hi:[.040, .012, -.030], contrast:1.06, exposure:1.00},   // 火 따뜻한 레드 · 코랄
  {temp: .16, tint:-.02, sat:1.20, skinSat:1.03, sh:[.040, .022, -.045], mid:[.045, .030, -.050], hi:[.040, .032, -.055], contrast:1.03, exposure:1.02},   // 土 골드 · 옐로
  {temp:-.05, tint: .06, sat:1.14, skinSat:1.05, sh:[-.010, -.012, .045], mid:[.010, -.008, .028], hi:[.004, .004, .012], contrast:1.12, exposure:1.05},   // 金 깨끗한 화이트 · 은은한 라벤더
  {temp:-.17, tint:-.03, sat:1.30, skinSat:1.05, sh:[-.045, .005, .075], mid:[-.040, .020, .055], hi:[-.020, .012, .035], contrast:1.04, exposure:1.00}    // 水 시원한 블루 · 시안
];
const SKIN_KEEP = .78;   // 피부에서 덜어내는 보정 비율(0 = 그대로 적용, 1 = 피부는 보정 없음)

const vec3 = a => `vec3(${a.map(x => x.toFixed(4)).join(',')})`;
const glProfile = p => {
  const gains = [Math.exp(p.temp + p.tint / 2), Math.exp(-p.tint), Math.exp(-p.temp + p.tint / 2)];
  return `P(${vec3(gains)},${p.sat.toFixed(4)},${p.skinSat.toFixed(4)},${vec3(p.sh)},${vec3(p.mid)},${vec3(p.hi)},${p.contrast.toFixed(4)},${p.exposure.toFixed(4)})`;
};
export const gradeGLSL = `
struct P{vec3 gains;float sat;float skinSat;vec3 sh;vec3 mid;vec3 hi;float contrast;float exposure;};
P profileOf(float e){
 if(e<.5)return ${glProfile(PROFILES[0])};
 if(e<1.5)return ${glProfile(PROFILES[1])};
 if(e<2.5)return ${glProfile(PROFILES[2])};
 if(e<3.5)return ${glProfile(PROFILES[3])};
 return ${glProfile(PROFILES[4])};
}
float skinMask(vec3 c){
 float y=dot(c,vec3(.299,.587,.114));float cb=-.168736*c.r-.331264*c.g+.5*c.b;float cr=.5*c.r-.418688*c.g-.081312*c.b;
 float m=smoothstep(.015,.045,cr)*(1.-smoothstep(.17,.21,cr))*smoothstep(-.20,-.15,cb)*(1.-smoothstep(-.015,.015,cb));
 return m*smoothstep(.10,.22,y)*(1.-smoothstep(.93,.99,y));
}
vec3 gradeColor(vec3 rgb,float e,float amount){
 if(amount<.001)return rgb;
 P p=profileOf(e);
 float s=skinMask(rgb);float keep=s*${SKIN_KEEP.toFixed(3)};
 vec3 L3=vec3(.2126,.7152,.0722);
 vec3 c=rgb*mix(p.gains,vec3(1.),keep);
 c*=mix(p.exposure,1.,keep*.5);
 float y=dot(c,L3);
 float ws=(1.-y)*(1.-y),wh=y*y,wm=max(0.,1.-ws-wh);
 vec3 t=p.sh*ws+p.mid*wm+p.hi*wh;t-=dot(t,L3);
 c+=t*(1.-keep)*1.6;
 y=dot(c,L3);
 float sat=mix(p.sat,p.skinSat,s);
 float chroma=max(c.r,max(c.g,c.b))-min(c.r,min(c.g,c.b));
 sat=1.+(sat-1.)*(1.-.45*smoothstep(.25,.7,chroma));
 c=y+(c-y)*sat;
 float k=mix(p.contrast,1.+(p.contrast-1.)*.5,s);
 c=(c-.5)*k+.5;
 return clamp(mix(rgb,c,amount),0.,1.);
}`;

const sm = (lo, hi, x) => { const t = Math.max(0, Math.min(1, (x - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
const CACHE = PROFILES.map(p => ({...p, gains:[Math.exp(p.temp + p.tint / 2), Math.exp(-p.tint), Math.exp(-p.temp + p.tint / 2)]}));
export function skinMask(r, g, b){
  const y = .299 * r + .587 * g + .114 * b, cb = -.168736 * r - .331264 * g + .5 * b, cr = .5 * r - .418688 * g - .081312 * b;
  return sm(.015, .045, cr) * (1 - sm(.17, .21, cr)) * sm(-.20, -.15, cb) * (1 - sm(-.015, .015, cb)) * sm(.10, .22, y) * (1 - sm(.93, .99, y));
}
// e: 0~4 오행, amount: 0~1, out: 길이 3 배열
export function gradeColor(r, g, b, e, amount, out){
  if (!amount || e < 0) { out[0] = r; out[1] = g; out[2] = b; return out; }
  const p = CACHE[Math.round(e)], s = skinMask(r, g, b), keep = s * SKIN_KEEP;
  const mixv = (a, b2, t) => a + (b2 - a) * t;
  const ex = mixv(p.exposure, 1, keep * .5);
  let c0 = r * mixv(p.gains[0], 1, keep) * ex, c1 = g * mixv(p.gains[1], 1, keep) * ex, c2 = b * mixv(p.gains[2], 1, keep) * ex;
  let y = c0 * .2126 + c1 * .7152 + c2 * .0722;
  const ws = (1 - y) * (1 - y), wh = y * y, wm = Math.max(0, 1 - ws - wh);
  let t0 = p.sh[0] * ws + p.mid[0] * wm + p.hi[0] * wh, t1 = p.sh[1] * ws + p.mid[1] * wm + p.hi[1] * wh, t2 = p.sh[2] * ws + p.mid[2] * wm + p.hi[2] * wh;
  const tl = t0 * .2126 + t1 * .7152 + t2 * .0722; t0 -= tl; t1 -= tl; t2 -= tl;
  const f = (1 - keep) * 1.6; c0 += t0 * f; c1 += t1 * f; c2 += t2 * f;
  y = c0 * .2126 + c1 * .7152 + c2 * .0722;
  let sat = mixv(p.sat, p.skinSat, s);
  const chroma = Math.max(c0, c1, c2) - Math.min(c0, c1, c2);
  sat = 1 + (sat - 1) * (1 - .45 * sm(.25, .7, chroma));
  c0 = y + (c0 - y) * sat; c1 = y + (c1 - y) * sat; c2 = y + (c2 - y) * sat;
  const k = mixv(p.contrast, 1 + (p.contrast - 1) * .5, s);
  c0 = (c0 - .5) * k + .5; c1 = (c1 - .5) * k + .5; c2 = (c2 - .5) * k + .5;
  const cl = v => Math.max(0, Math.min(1, v));
  out[0] = cl(r + (c0 - r) * amount); out[1] = cl(g + (c1 - g) * amount); out[2] = cl(b + (c2 - b) * amount);
  return out;
}
