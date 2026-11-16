// 김수민 — Sumin Kim · Figma 2576:20333 (우측 컷아웃 4장 추가, User Flow 항목 삭제)
export default {
  key:'sumin',
  name:'Sumin Kim', nameBox:{x:683, y:102},
  photo:'sumin-photo.webp',
  left:{whoY:290, starY:486.4},
  icons:{mail:{x:1075, y:150}, behance:{x:1124, y:150}},
  links:{mail:null, behance:null},
  credits:{
    x:683, krFont:'pretendard',
    sections:[
      {y:290, head:'[ RESEARCH & STRATEGY ]', items:[[330, 'Desk Research', '데스크 리서치'], [406, 'User Research', '사용자 조사'], [482, 'Information Architecture', '정보 구조 설계']]},
      {y:596, head:'[ PRODUCT DESIGN ]', items:[[636, 'App GUI Design', '앱 GUI 디자인'], [712, '-Onboarding', '온보딩'], [788, '-Record Tab', '기록 탭']]},
      {y:902, head:'[ BRAND IDENTITY ]', items:[[942, 'Brand Storytelling', '브랜드 스토리텔링'], [1018, 'Brand Application & Mockup', '브랜드 어플리케이션 디자인 및 목업 제작'], [1094, 'Watch Accessory Modeling & Design', '워치 액세서리 모델링 및 디자인']]},
      {y:1208, head:'[ FILM & CHARACTER ]', items:[[1248, 'Promotional / Scenario Film Storyboard', '프로모션 및 시나리오 영상 스토리보드'], [1324, 'Main Character Sheet', '메인 캐릭터 시트 제작'], [1400, 'AI Scenario Film Generation', 'AI 시나리오 영상 생성'], [1476, 'Website Scenario Tab', '웹사이트 시나리오 탭 구성']]},
      {y:1590, head:'[ EXHIBITION EXPERIENCE ]', items:[[1630, 'Exhibition Banner Design', '전시 배너 디자인'], [1706, 'Exhibition Guide Print', '전시 안내 지류 디자인'], [1782, 'Print & Goods Production', '지류·물품 발주 및 관리']]},
      {y:1896, head:'[ SPECIAL THANKS TO ]', names:[[1936, 'My Teammates'], [1976, 'Yujin Lee'], [2016, 'Hyeonha Seo']]}
    ]
  },
  // Figma 레이어 순서상 4장 모두 크레딧 위. 위치는 Figma 2576:20333(회전 프레임)을 세로 페이지 좌표로 옮긴 값
  cutouts:[
    {src:'sumin-cut1.webp', x:1143, y:151, w:124, h:453, over:true},
    {src:'sumin-cut2.webp', x:1155, y:725, w:211, h:217, over:true},
    {src:'sumin-cut3.webp', x:1201, y:1400, w:165, h:251, over:true},
    {src:'sumin-cut4.webp', x:1120, y:1881, w:134, h:283, over:true}
  ]
};
