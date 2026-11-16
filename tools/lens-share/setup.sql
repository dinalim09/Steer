-- Steer Luck Lens QR 저장 · Supabase SQL Editor에서 한 번 실행한다
-- 1) 공개 버킷: 2MB 이하 JPEG만 허용. 공개 URL로 읽기는 되지만 목록 조회 정책이 없어 다른 사진을 나열할 수 없다
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lens', 'lens', true, 2097152, array['image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

-- 2) 익명(anon) 키는 새 파일 업로드만 가능. 파일 이름은 22자 난수 + .jpg 형식만 허용(덮어쓰기 · 수정 · 삭제 · 목록 불가)
drop policy if exists "lens anon upload" on storage.objects;
create policy "lens anon upload" on storage.objects for insert to anon
with check (bucket_id = 'lens' and name ~ '^[A-Za-z0-9_-]{22}\.jpg$');

-- 3) 매시 7분 정리 함수 호출(24시간 지난 사진 삭제 → 최대 약 25시간 보관)
--    Integrations › Cron, Integrations › pg_net(Database › Extensions의 pg_cron · pg_net)을 켠 뒤 실행한다
select cron.schedule('lens-cleanup', '7 * * * *', $$
  select net.http_post(url := 'https://tqswusyecsfgwryzkybb.supabase.co/functions/v1/lens-cleanup', body := '{}'::jsonb);
$$);
