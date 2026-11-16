// Supabase Edge Function: lens 버킷에서 24시간 지난 사진을 지운다. pg_cron이 매시 7분에 호출한다.
// 보안: 'Verify JWT'는 끄고(새 publishable/secret 키는 JWT가 아님), 대신 예약 실행 전용 secret을 직접 검증한다.
//  - Edge Function Secrets의 LENS_CLEANUP_SECRET과 요청 헤더 x-lens-cleanup-secret이 일치할 때만 실행
//  - 같은 값은 DB Vault('lens_cleanup_secret')에 있고, pg_cron 작업이 실행 시점에 읽어 헤더로 보낸다
import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET = 'lens', TTL_MS = 24 * 60 * 60 * 1000, PAGE = 1000;
const SECRET = Deno.env.get('LENS_CLEANUP_SECRET') ?? '';

// 길이·내용과 무관하게 같은 시간으로 비교(SHA-256 해시 후 바이트 XOR)
async function same(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const u = new Uint8Array(x), v = new Uint8Array(y); let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (SECRET.length < 32) { console.error('LENS_CLEANUP_SECRET 미설정 또는 너무 짧음'); return json({ error: 'not_configured' }, 503); }
  if (!(await same(req.headers.get('x-lens-cleanup-secret') ?? '', SECRET))) { console.warn('secret 불일치 요청 거부'); return json({ error: 'unauthorized' }, 401); }

  let key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  try { key = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default || key; } catch { /* 기존 키 사용 */ }
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, key);
  const cutoff = Date.now() - TTL_MS, old: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await sb.storage.from(BUCKET).list('', { limit: PAGE, offset, sortBy: { column: 'created_at', order: 'asc' } });
    if (error) { console.error('list 실패', error.message); return json({ error: 'list_failed', message: error.message }, 500); }
    let done = data.length < PAGE;
    for (const f of data) {
      if (!f.id || !f.created_at) continue;                  // 폴더 항목 건너뜀
      if (Date.parse(f.created_at) < cutoff) old.push(f.name); else { done = true; break; }   // 오래된 순: 기준보다 새 파일이 나오면 끝
    }
    if (done) break;
  }
  for (let i = 0; i < old.length; i += 100) {
    const { error } = await sb.storage.from(BUCKET).remove(old.slice(i, i + 100));
    if (error) { console.error('remove 실패', error.message); return json({ error: 'remove_failed', message: error.message, removed: i }, 500); }
  }
  console.log(`정리 완료: ${old.length}개 삭제`);
  return json({ removed: old.length });
});
