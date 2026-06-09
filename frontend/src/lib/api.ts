/** Thin fetch wrapper for the Rocket API. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export async function apiHealth(): Promise<{ status: string; service: string; db: string }> {
  const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`API health failed: ${res.status}`);
  return res.json();
}

export { API_BASE };
