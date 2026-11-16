// Luck Lens QR 저장용 임시 스토리지 설정(Supabase Storage).
// url 또는 anonKey가 비어 있으면 QR 기능은 꺼지고, 결과 화면에는 기존 '사진 저장'(iPad 저장) 버튼만 보인다.
// anonKey에는 Project Settings › API Keys의 공개용 anon(publishable) 키만 넣는다. service_role(secret) 키는 절대 넣지 않는다.
export const SHARE = {
  url: '',            // 예: https://abcdefghijklmnop.supabase.co
  anonKey: '',        // 공개용 anon 키
  bucket: 'lens',     // 공개 버킷 이름(tools/lens-share/setup.sql과 같아야 한다)
  ttlHours: 24,       // 안내 문구와 모바일 페이지의 만료 판정 기준. 실제 삭제는 정리 함수가 한다
  pageBase: ''        // 비우면 iPad에서 연 주소 기준의 photo.html. 다른 주소를 쓰려면 전체 URL을 넣는다
};
