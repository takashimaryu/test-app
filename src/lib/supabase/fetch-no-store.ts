/**
 * Next.js の Data Cache が PostgREST の応答を固着させないよう、常に再取得する fetch。
 */
export function supabaseNoStoreFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  return fetch(input, {
    ...init,
    cache: "no-store",
  });
}
