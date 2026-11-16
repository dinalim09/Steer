// Luck Lens 촬영 결과를 임시 스토리지(Supabase Storage)에 올리고, 모바일 저장 페이지 주소를 만든다.
// 사진 경로는 128비트 난수(base64url 22자)라 추측할 수 없고, 버킷은 목록 조회가 막혀 있다. 사진은 정리 함수가 24시간 뒤 지운다.
import {SHARE} from './share-config.js';

export const shareConfig = SHARE;
export const shareEnabled = () => !!(SHARE.url && SHARE.anonKey && SHARE.bucket);
export const ID_RE = /^[A-Za-z0-9_-]{22}$/;

const api = () => SHARE.url.replace(/\/+$/, '');
export function newId(){
  const b = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const objectPath = id => id + '.jpg';
export const publicURL = id => `${api()}/storage/v1/object/public/${SHARE.bucket}/${objectPath(id)}`;
// 사진 ID는 해시(#)에 담는다 → 페이지 서버 로그·리퍼러에 남지 않는다
export function pageURL(id){
  const base = SHARE.pageBase || new URL('../../photo.html', import.meta.url).href;
  return base.split('#')[0] + '#' + id;
}

// 업로드: 덮어쓰기 없이 새 파일만 만든다(익명 키에는 insert 권한만 있음). timeoutMs 안에 끝나지 않으면 실패로 본다
export async function upload(blob, id, signal, timeoutMs = 20000){
  const ctl = new AbortController(), stop = () => ctl.abort();
  if (signal) { if (signal.aborted) stop(); else signal.addEventListener('abort', stop, {once:true}); }
  const to = setTimeout(stop, timeoutMs);
  try {
    const r = await fetch(`${api()}/storage/v1/object/${SHARE.bucket}/${objectPath(id)}`, {
      method:'POST', body:blob, signal:ctl.signal, cache:'no-store',
      headers:{authorization:'Bearer ' + SHARE.anonKey, apikey:SHARE.anonKey, 'content-type':'image/jpeg', 'cache-control':'3600', 'x-upsert':'false'}
    });
    if (!r.ok) throw Object.assign(new Error('upload_' + r.status), {reason:'http_' + r.status});
  } catch (e) {
    if (e && e.name === 'AbortError') throw Object.assign(new Error('upload_abort'), {reason:signal && signal.aborted ? 'cancel' : 'timeout'});
    throw Object.assign(e instanceof Error ? e : new Error('upload'), {reason:(e && e.reason) || 'network'});
  } finally {
    clearTimeout(to); if (signal) signal.removeEventListener('abort', stop);
  }
}
