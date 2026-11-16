// Supabase Edge Function: lens 버킷에서 24시간 지난 사진을 지운다. pg_cron이 매시간 호출한다.
// 배포: supabase functions deploy lens-cleanup --no-verify-jwt
// (24시간 지난 파일만 지우므로 누가 호출해도 해가 없어 JWT 검증을 끈다. 서비스 키는 함수 안의 환경 변수로만 쓴다)
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'lens', TTL_MS = 24 * 60 * 60 * 1000, PAGE = 1000;

Deno.serve(async () => {
  // 새 secret 키(SUPABASE_SECRET_KEYS)를 우선 쓰고, 없으면 기존 service_role 키를 쓴다
  let key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  try { key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default || key; } catch { /* 기존 키 사용 */ }
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, key);
  const cutoff = Date.now() - TTL_MS, old: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await sb.storage.from(BUCKET).list('', { limit: PAGE, offset, sortBy: { column: 'created_at', order: 'asc' } });
    if (error) return new Response(error.message, { status: 500 });
    let done = data.length < PAGE;
    for (const f of data) {
      if (!f.id || !f.created_at) continue;                  // 폴더 항목 건너뜀
      if (Date.parse(f.created_at) < cutoff) old.push(f.name); else { done = true; break; }   // 오래된 순 정렬: 기준보다 새 파일이 나오면 끝
    }
    if (done) break;
  }
  for (let i = 0; i < old.length; i += 100) {
    const { error } = await sb.storage.from(BUCKET).remove(old.slice(i, i + 100));
    if (error) return new Response(error.message, { status: 500 });
  }
  return Response.json({ removed: old.length });
});
