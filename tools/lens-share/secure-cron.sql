-- Steer Luck Lens · 정리 함수 예약 실행 secret 적용 (SQL Editor에서 단계별로 실행)

-- [A] Vault에 예약 실행 전용 secret 생성: DB 안에서 32바이트 난수를 만든다(값이 SQL 문에 남지 않음)
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'lens_cleanup_secret', 'lens-cleanup 예약 실행 전용');

-- [B] 값 확인(이 결과는 Edge Function Secrets에 붙여 넣는 용도로만 쓰고, 채팅·문서에 옮기지 않는다)
select decrypted_secret from vault.decrypted_secrets where name = 'lens_cleanup_secret';

-- [C] 기존 예약(jobid 1, secret 없음) 해제 후 재등록: 실행 시점에 Vault에서 읽어 헤더로 전달 → 작업 정의(cron.job)에 값이 남지 않는다
select cron.unschedule('lens-cleanup');
select cron.schedule('lens-cleanup', '7 * * * *', $$
  select net.http_post(
    url := 'https://tqswusyecsfgwryzkybb.supabase.co/functions/v1/lens-cleanup',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-lens-cleanup-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'lens_cleanup_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000);
$$);
