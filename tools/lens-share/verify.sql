-- Steer Luck Lens · 정리 함수 점검 쿼리

-- 1) 예약 등록 상태: active = true 이고 command에 secret 값이 아니라 vault 조회문이 보여야 한다
select jobid, jobname, schedule, active, command from cron.job where jobname = 'lens-cleanup';

-- 2) 예약 실행 이력(SQL 단계): status = succeeded 는 'HTTP 요청을 큐에 넣는 데 성공'까지만 뜻한다
select runid, status, return_message, start_time, end_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'lens-cleanup')
order by start_time desc limit 10;

-- 3) 실제 함수 응답(HTTP 단계, 약 6시간 보관): status_code 200 + {"removed":N} 이어야 실제 성공
select id, status_code, content, error_msg, timed_out, created
from net._http_response order by created desc limit 10;

-- 4) 수동 실행(예약과 같은 요청). 실행 후 몇 초 뒤 3)을 다시 조회한다
select net.http_post(
  url := 'https://tqswusyecsfgwryzkybb.supabase.co/functions/v1/lens-cleanup',
  headers := jsonb_build_object('content-type', 'application/json',
    'x-lens-cleanup-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'lens_cleanup_secret')),
  body := '{}'::jsonb, timeout_milliseconds := 15000) as request_id;

-- 5) 버킷·업로드 정책
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'lens';
select policyname, cmd, roles, with_check from pg_policies where schemaname = 'storage' and tablename = 'objects';

-- 6) 보관 중인 사진 수와 가장 오래된 사진 시각(25시간을 넘는 항목이 없어야 한다)
select count(*) as files, min(created_at) as oldest from storage.objects where bucket_id = 'lens';
