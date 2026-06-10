// k6 load test for the Rocket API. Run with:
//   k6 run -e BASE=http://localhost:4000 ops/load-test.js
//
// Exercises the hot read path (auth + workspace + collection list) under load.
// Tune VUs/duration for your target; the request-proxy path is intentionally
// excluded so the test doesn't hammer third-party APIs.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE || 'http://localhost:4000';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // ramp up
    { duration: '1m', target: 50 }, // steady
    { duration: '20s', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% errors
    http_req_duration: ['p(95)<500'], // 95% under 500ms
  },
};

export function setup() {
  const email = `load-${Date.now()}-${Math.random().toString(36).slice(2)}@rocket.test`;
  const jar = http.cookieJar();
  const res = http.post(
    `${BASE}/api/auth/register`,
    JSON.stringify({ email, password: 'supersecret', name: 'Load' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  check(res, { registered: (r) => r.status === 201 });
  const ws = JSON.parse(http.get(`${BASE}/api/workspaces`, { jar }).body)[0].id;
  return { cookies: jar.cookiesForURL(`${BASE}/`), workspaceId: ws };
}

export default function (data) {
  const jar = http.cookieJar();
  for (const [name, vals] of Object.entries(data.cookies)) jar.set(`${BASE}/`, name, vals[0]);

  const r1 = http.get(`${BASE}/api/auth/me`, { jar });
  const r2 = http.get(`${BASE}/api/workspaces/${data.workspaceId}`, { jar });
  check(r1, { 'me 200': (r) => r.status === 200 });
  check(r2, { 'workspace 200': (r) => r.status === 200 });
  sleep(1);
}
