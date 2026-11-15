import {FilesetResolver, HandLandmarker} from './vendor/vision_bundle.mjs';
import {palmPose} from './hand-geometry.mjs';
let detector;
self.onmessage = async ({data}) => {
  if (data.type === 'init') {
    try {
      const files = await FilesetResolver.forVisionTasks(new URL('./vendor/wasm', self.location.href).href, true);
      detector = await HandLandmarker.createFromOptions(files, {baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task', self.location.href).href, delegate:'CPU'}, runningMode:'VIDEO', numHands:1, minHandDetectionConfidence:.6, minHandPresenceConfidence:.6, minTrackingConfidence:.55});
      self.postMessage({type:'ready'});
    } catch (error) { self.postMessage({type:'error', message:String(error)}); }
  } else if (data.type === 'frame') {
    try { const result = detector.detectForVideo(data.image, data.time); self.postMessage({type:'pose', pose:palmPose(result.landmarks[0]), time:data.time}); }
    catch (error) { self.postMessage({type:'error', message:String(error)}); }
  }
};
