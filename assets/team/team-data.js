// STEER Team 데이터 — 이름·사진·역할·크레딧은 여기만 고치면 된다.
// Figma(3967:3442 메인 · 3967:3331 개인 페이지)에 확정된 값만 넣었다. null 또는 placeholder:true 항목은 미확정이라
// 화면에 흐린 자리표시로만 나온다(실제 정보처럼 보이지 않게). 확정되면 값만 바꾸면 된다.

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

// 팀원 — 사진·숫자와 바늘의 연결은 Figma 배치(각 사진이 놓인 바늘 끝)를 따른다
//  (30m) 사진 → 분침 끝 · (1h) 사진 → 시침 끝 · (3h) 사진 → 초침 끝
//  개인 페이지(3967:3331)에 (30m) 사진과 함께 'Chaeeun Lim'이 확정되어 있다. 나머지 두 사람의 이름·크레딧은 Figma에 없다.
export const MEMBERS = [
  {
    id:1, hand:'minute', label:'(3om)',            // Figma 표기 그대로('3o' — Megascope 숫자 0 대신 o)
    photo:'m1.webp', photoBlur:'m1-blur.webp',
    labelBox:{x:385, y:323, w:72, align:'left'}, photoBox:{x:361, y:371},
    name:'Chaeeun Lim',
    links:{mail:null, behance:null},               // 주소 미확정: 아이콘만 표시
    cutouts:[{src:'cut-b.webp', x:1106, y:286, w:201, h:379}, {src:'cut-a.webp', x:906, y:603, w:338, h:450}],
    credits:null                                   // Figma의 'Brand Visual Lead' ×10은 임시 반복 문구 → 미확정
  },
  {
    id:2, hand:'hour', label:'(1h)',
    photo:'m2.webp', photoBlur:'m2-blur.webp',
    labelBox:{x:756.5, y:423, w:41, align:'left'}, photoBox:{x:717, y:471},
    name:null, links:{mail:null, behance:null}, cutouts:[], credits:null
  },
  {
    id:3, hand:'second', label:'(3h)',
    photo:'m3.webp', photoBlur:'m3-blur.webp',
    labelBox:{x:973.5, y:711, w:47, align:'center'}, photoBox:{x:937, y:759},
    name:null, links:{mail:null, behance:null}, cutouts:[], credits:null
  }
];

// 팀 전체 공통(Figma 개인 페이지에 확정)
export const SPECIAL_THANKS = ['Yoonsoo Cho', 'Juyeon Choi', 'Seunghyeon Yeom', 'Eunseo Ko'];
// 미확정 크레딧 자리표시 줄 수
export const CREDIT_PLACEHOLDER_LINES = 6;
