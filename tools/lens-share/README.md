# Luck Lens QR 저장 · Supabase 설정

iPad의 Luck Lens 결과 사진을 Supabase Storage에 임시로 올리고, 관람객은 QR로 `photo.html#<사진ID>`를 열어 저장한다.
`assets/lens/share-config.js`의 `url`·`anonKey`가 비어 있으면 QR 기능은 꺼지고 기존 iPad 저장 버튼만 보인다.

## 구성
- `assets/lens/share.js` — 업로드(REST, SDK 없음) · 128비트 난수 ID · 저장 페이지 주소
- `assets/lens/vendor/qrcode.mjs` — QR 생성(qrcode-generator 1.4.4, MIT, 로컬 포함)
- `photo.html` — 관람객 스마트폰용 저장 페이지
- `tools/lens-share/setup.sql` — 버킷 · 업로드 정책 · 정리 예약
- `tools/lens-share/lens-cleanup/index.ts` — 24시간 지난 사진 삭제 함수

## 설정 순서
1. supabase.com에서 프로젝트 생성(리전: Northeast Asia (Seoul)).
2. Database › Extensions에서 `pg_cron`, `pg_net` 활성화.
3. Edge Functions에 `lens-cleanup` 배포(`--no-verify-jwt`). 대시보드 편집기에 `index.ts` 내용을 붙여 넣어도 된다.
4. SQL Editor에서 `setup.sql` 실행(`<PROJECT_REF>` 교체).
5. Project Settings › API Keys에서 Project URL과 anon(publishable) 키를 `share-config.js`에 입력.

## 확인 항목
- 업로드: 결과 화면에 QR이 뜨는지, Storage › lens에 `22자.jpg`가 생기는지
- 보안: anon 키로 목록 조회(`POST /storage/v1/object/list/lens`)가 빈 결과 또는 거부인지
- 정리: Edge Functions › lens-cleanup › Logs에서 매시 7분 호출 기록
