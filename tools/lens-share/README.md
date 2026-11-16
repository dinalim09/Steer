# Luck Lens QR 저장 · Supabase 설정

iPad의 Luck Lens 결과 사진을 Supabase Storage에 임시로 올리고, 관람객은 QR로 `photo.html#<사진ID>`를 열어 저장한다.
`assets/lens/share-config.js`의 `url`·`anonKey`가 비어 있으면 QR 기능은 꺼지고 기존 iPad 저장 버튼만 보인다.

## 구성
- `assets/lens/share.js` — 업로드(REST, SDK 없음) · 128비트 난수 ID · 저장 페이지 주소
- `assets/lens/vendor/qrcode.mjs` — QR 생성(qrcode-generator 1.4.4, MIT, 로컬 포함)
- `photo.html` — 관람객 스마트폰용 저장 페이지
- `tools/lens-share/setup.sql` — 버킷 · 업로드 정책 · 정리 예약
- `tools/lens-share/lens-cleanup/index.ts` — 24시간 지난 사진 삭제 함수(예약 실행 전용 secret 검증)
- `tools/lens-share/secure-cron.sql` — Vault secret 생성 · 예약 재등록
- `tools/lens-share/verify.sql` — 예약 · 실행 · 응답 · 정책 점검

## 설정 순서
1. supabase.com에서 프로젝트 생성(리전: Northeast Asia (Seoul)).
2. Database › Extensions에서 `pg_cron`, `pg_net` 활성화.
3. SQL Editor에서 `setup.sql` 실행(버킷 · 업로드 정책).
4. 정리 함수 보안: `secure-cron.sql`의 [A]·[B] 실행 → [B] 값을 Edge Functions › Secrets에 `LENS_CLEANUP_SECRET`으로 저장 → `lens-cleanup/index.ts` 배포(Verify JWT 끔) → [C] 실행.
   함수는 `x-lens-cleanup-secret` 헤더가 맞을 때만 실행되고, pg_cron은 실행 시점에 Vault에서 값을 읽어 보낸다.
5. Project Settings › API Keys에서 Project URL과 anon(publishable) 키를 `share-config.js`에 입력.

## 확인 항목
- 업로드: 결과 화면에 QR이 뜨는지, Storage › lens에 `22자.jpg`가 생기는지
- 보안: anon 키로 목록 조회(`POST /storage/v1/object/list/lens`)가 빈 결과 또는 거부인지
- 정리: `verify.sql`로 예약 등록 · 실행 이력 · HTTP 응답 확인. Edge Functions › lens-cleanup › Logs에서 매시 7분 호출 기록
- 외부 호출 차단: 브라우저로 함수 주소를 열면 405 `Method Not Allowed`, secret 없이 POST하면 401 `Unauthorized`이어야 한다
- 이 파일과 실제 배포 함수는 같은 인증 방식(헤더 `x-lens-cleanup-secret` = Secrets `LENS_CLEANUP_SECRET` = Vault `lens_cleanup_secret`)을 쓴다. 현재 배포 함수가 정상이면 다시 배포할 필요는 없다
