// STEER Team 데이터 — 시계(바늘)·메인 사진 배치는 여기, 팀원별 개인 페이지 내용은 members/*.js.
// Figma 3967:3442(메인) · 개인 페이지 2548:5219(임채은) · 2543:19422(김수민) · 2543:19530(윤영실)

// 바늘(Figma 3967:3442): 피벗은 세 바늘 축의 공통 교점(489.1, 901.5). 길이·두께·초기 각도(CSS rotate, 시계 방향 +)는 Figma 그대로.
//  - 초침: 가장 길고 얇은 하늘색(#87E6FF) 바늘 / 분침: 긴 검정 바늘 / 시침: 짧은 검정 바늘
//  - along: 피벗에서 바늘 중심까지의 거리(바늘은 피벗 뒤로 약 75px 꼬리가 있다)
export const PIVOT = {x:489.1, y:901.5};
// 한 바퀴 시간(초) — 여기서만 바꾼다
export const PERIOD = {second:30, minute:90, hour:180};
export const HANDS = {
  second:{angle:61.603, length:588.948, width:6.416, along:216.0, color:'#87E6FF'},
  minute:{angle:-15.958, length:514, width:15, along:179.5, color:'#0A0A0A'},
  hour:{angle:26.34, length:299.165, width:15, along:79.3, color:'#0A0A0A'}
};

// 팀원 — 메인 사진·숫자와 바늘의 연결은 Figma 배치(각 사진이 놓인 바늘 끝)를 따른다
//  (30m) 사진 → 분침 끝 · (1h) 사진 → 시침 끝 · (3h) 사진 → 초침 끝
//  Team 배치 순서: 1 임채은 → 2 김수민 → 3 윤영실. 개인 페이지 내용(이름·크레딧·컷아웃)은 members/*.js에 팀원별로 분리
//  메인 사진(m1-blur · sumin-blur · yeongsil-blur)은 각 팀원 개인 페이지 프로필 사진(Figma)을 2배로 놓고 흐림(Gaussian 4px · 2배 기준)을 준 것 — m1과 같은 방식
import CHAEEUN from './members/chaeeun.js?v=20261117-7';
import SUMIN from './members/sumin.js?v=20261117-3';
import YEONGSIL from './members/yeongsil.js?v=20261117-1';
export const MEMBERS = [
  {id:1, hand:'minute', label:'(3om)',              // Figma 표기 그대로('3o' — Megascope 숫자 0 대신 o)
   photoBlur:'m1-blur.webp', labelBox:{x:385, y:323, w:72, align:'left'}, photoBox:{x:361, y:371}, ...CHAEEUN},
  {id:2, hand:'hour', label:'(1h)',
   photoBlur:'sumin-blur.webp', labelBox:{x:756.5, y:423, w:41, align:'left'}, photoBox:{x:717, y:471}, ...SUMIN},
  {id:3, hand:'second', label:'(3h)',
   photoBlur:'yeongsil-blur.webp', labelBox:{x:973.5, y:711, w:47, align:'center'}, photoBox:{x:937, y:759}, ...YEONGSIL}
];
