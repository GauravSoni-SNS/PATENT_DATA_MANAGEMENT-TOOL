/**
 * Integration test script - run with: npm run test:api
 */
const API = 'http://localhost:4000/api/v1';

async function test() {
  let passed = 0;
  let failed = 0;

  const assert = (name: string, condition: boolean) => {
    if (condition) { console.log(`  PASS: ${name}`); passed++; }
    else { console.log(`  FAIL: ${name}`); failed++; }
  };

  console.log('=== LexPatent API Integration Tests ===\n');

  const health = await fetch(`${API}/health`).then((r) => r.json());
  assert('Health check', health.status === 'ok');

  const loginRes = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 's.jenkins@lexpatent-ip.com', password: 'password123' }),
  }).then((r) => r.json());
  const token = loginRes.data?.accessToken;
  assert('Login', !!token);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const matters = await fetch(`${API}/matters`, { headers }).then((r) => r.json());
  assert('List matters', matters.data?.length >= 6);

  const radar = await fetch(`${API}/notifications/radar`, { headers }).then((r) => r.json());
  assert('Radar counts', typeof radar.data?.dailyCritical === 'number');

  const rules = await fetch(`${API}/rules/calculate`, {
    method: 'POST', headers,
    body: JSON.stringify({ triggerEvent: 'PROVISIONAL_FILED', triggerDate: '2025-08-20', jurisdiction: 'IN' }),
  }).then((r) => r.json());
  assert('Rules calculator', rules.data?.deadlines?.length >= 2);

  const scan = await fetch(`${API}/notifications/scan`, { method: 'POST', headers }).then((r) => r.json());
  assert('Cron scan', scan.data?.notificationsGenerated >= 0);

  const dashboard = await fetch(`${API}/dashboard/summary`, { headers }).then((r) => r.json());
  assert('Dashboard summary', dashboard.data?.totalActiveMatters >= 6);

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

test().catch((e) => {
  console.error('Test error:', e.message);
  process.exit(1);
});
