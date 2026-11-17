// 임채은 — Chaeeun Lim · Figma 2548:5219 (Team · Chaeeun). 좌표는 1366 폭 프레임 기준 px, y는 프레임 맨 위 기준(1024 아래로 이어지는 부분은 엔딩 크레딧으로 올라온다)
export default {
  key:'chaeeun',
  name:'Chaeeun Lim', nameBox:{x:667, y:102},
  photo:'m1.webp',                                  // 프로필(괄호 안) = 메인 (3om) 사진과 같은 원본
  left:{whoY:286, starY:483.4},                     // 'Who Made ( ) This' · 별(Figma Union 104,472 회전 경계 → 이미지 위치)
  icons:{mail:{x:1075, y:150}, behance:{x:1124, y:150}},
  links:{mail:'mailto:dinalim09@gmail.com', behance:'https://www.behance.net/limchaeeun'},   // Figma 주석
  credits:{
    x:667, krFont:'noto',
    sections:[
      {y:286, head:'[ RESEARCH & STRATEGY ]', items:[[326, 'UX Research', '데스크 리서치 및 사용자 조사']]},
      {y:440, head:'[ BRAND IDENTITY ]', items:[[480, 'BI Main Symbol', '브랜드 메인 심볼 디자인'], [558, 'Main Slogan', '브랜드 메인 슬로건'], [636, 'Brand Website', '브랜드 웹사이트 기획 및 디자인'], [714, 'Brand Key color', '브랜드 키컬러']]},
      {y:828, head:'[ PRODUCT DESIGN ]', items:[[868, 'App GUI Design', '앱 GUI 디자인'], [944, '-Mission Combination Screen', '미션 조합 화면'], [1020, '-Steering Tab', '항해 탭'], [1096, 'Watch GUI & Motion', '워치 GUI 디자인 및 모션']]},
      {y:1218, head:'[ LOGIC & DEVELOPMENT ]', items:[[1258, 'UX Logic Structuring', '서비스 UX 로직 설계 및 정리'], [1334, 'Brand Website Development', '브랜드 웹사이트 개발'], [1410, 'Watch Looping App Development', '전시 루핑용 워치 앱 개발']]},
      {y:1524, head:'[ EXHIBITION EXPERIENCE ]', items:[[1564, 'Poster Design', '포스터 디자인'], [1640, 'App & Watch Guide Print', '모바일 미션 및 워치 화면 설명 지류 디자인'], [1716, 'StanbyMe Main Screen Graphic', '스탠바이미 메인 화면 그래픽 디자인', 'pretendard']]},
      {y:1838, head:'[ SPECIAL THANKS TO ]', names:[[1878, 'Yoonsoo Jo'], [1918, 'Juyeon Choi'], [1958, 'Seunghyeon Yeom'], [1998, 'Eunseo Ko'], [2038, 'Team Gemmy'], [2078, 'Team Hebe'], [2118, 'Team Steer']]},
      {y:2216, head:'[ SPECIAL Love TO ]', names:[[2256, 'Sunmin Lee'], [2296, 'Wooyoung Lim']]}
    ]
  },
  // 오른쪽 인물 컷아웃(Figma 레이어 순서: 모두 크레딧 위)
  cutouts:[
    {src:'chaeeun-cut4.webp', x:1000, y:1839, w:230, h:293, over:true},
    {src:'chaeeun-cut1.webp', x:1106, y:242, w:201, h:379, over:true},
    {src:'chaeeun-cut2.webp', x:942, y:499, w:216, h:331, over:true},
    {src:'chaeeun-cut3.webp', x:1050, y:1346, w:258, h:244, over:true}
  ]
};
