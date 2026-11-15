// 손 인식 Worker. 프레임은 ImageData(픽셀 버퍼)로 받는다 — ImageBitmap 전달이 브라우저마다 다르게 동작하는 문제를 피하기 위함.
// 응답마다 랜드마크 개수(n)와 palmPose 결과, 받은 프레임의 평균 밝기(lum)를 함께 돌려보내 메인 스레드가 Worker 상태를 진단한다.
import {FilesetResolver, HandLandmarker} from './vendor/vision_bundle.mjs';
import {palmPose} from './hand-geometry.mjs';
let detector = null;
const lumOf = d => { let s = 0, n = 0; for (let i = 0; i < d.length; i += 64) { s += d[i] * .299 + d[i + 1] * .587 + d[i + 2] * .114; n++; } return n ? s / n : 0; };
self.onmessage = async ({data}) => {
  if (data.type === 'init') {
    const t0 = performance.now();
    try {
      const files = await FilesetResolver.forVisionTasks(new URL('./vendor/wasm', self.location.href).href, true);
      // canvas를 직접 넘긴다: MediaPipe는 UA에 'Version/17 Safari'가 없으면(iPad Chrome 'CriOS' 등) Worker 안에서도
      // document.createElement('canvas')를 시도해 초기화가 실패한다. OffscreenCanvas가 없으면 넘기지 않고 메인 스레드 대체에 맡긴다
      const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(1, 1) : undefined;
      detector = await HandLandmarker.createFromOptions(files, {canvas, baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task', self.location.href).href, delegate:'CPU'}, runningMode:'VIDEO', numHands:1, minHandDetectionConfidence:.6, minHandPresenceConfidence:.6, minTrackingConfidence:.55});
      self.postMessage({type:'ready', ms:Math.round(performance.now() - t0)});
    } catch (error) { self.postMessage({type:'error', stage:'init', message:String(error && error.message || error)}); }
  } else if (data.type === 'frame') {
    if (!detector) { self.postMessage({type:'error', stage:'frame', message:'detector not ready', time:data.time}); return; }
    const t0 = performance.now();
    try {
      const image = new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height);
      const result = detector.detectForVideo(image, data.time);
      const marks = result.landmarks && result.landmarks[0];
      self.postMessage({type:'pose', time:data.time, n:marks ? marks.length : 0, pose:palmPose(marks), lum:lumOf(image.data), ms:Math.round(performance.now() - t0)});
    } catch (error) { self.postMessage({type:'error', stage:'frame', message:String(error && error.message || error), time:data.time}); }
  }
};
