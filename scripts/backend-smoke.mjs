#!/usr/bin/env node
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  url: { type: 'string' },
  origin: { type: 'string' },
  'expected-commit': { type: 'string' },
  'allow-writes': { type: 'boolean', default: false },
  'upload-mib': { type: 'string' },
} });

function target(value) {
  const url = new URL(value);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  assert.ok(url.protocol === 'https:' || (local && url.protocol === 'http:'), 'HTTPS is required');
  assert.ok(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'Use a bare API origin');
  return url.origin;
}

assert.ok(values.url, '--url is required');
const base = target(values.url);
const origin = values.origin ? target(values.origin) : undefined;
const session = randomUUID();
const evidence = [];

async function request(path, { method = 'GET', body, headers = {}, expected = 200 } = {}) {
  const response = await fetch(`${base}${path}`, {
    method, body, redirect: 'error', signal: AbortSignal.timeout(120_000),
    headers: { ...(origin ? { origin } : {}), ...headers },
  });
  assert.equal(response.status, expected, `${method} ${path}: unexpected HTTP status`);
  if (origin) assert.equal(response.headers.get('access-control-allow-origin'), origin, 'CORS must echo the exact allowed origin');
  const data = await response.json();
  evidence.push({ method, path, status: response.status });
  return data;
}

const health = await request('/healthz');
assert.equal(health.status, 'ok');
if (values['expected-commit']) assert.equal(health.commit, values['expected-commit'], 'Wrong deployed commit');
assert.equal((await request('/readyz')).status, 'ready');

if (values['allow-writes']) {
  const key = `migration-smoke-${randomUUID()}`;
  const body = JSON.stringify({ title: 'CONTROLLED_FIXTURE migration smoke' });
  const headers = { 'x-standby-session': session, 'idempotency-key': key, 'content-type': 'application/json' };
  const created = await request('/v1/cases', { method: 'POST', body, headers, expected: 201 });
  assert.equal(typeof created.case_id, 'string');
  const duplicate = await request('/v1/cases', { method: 'POST', body, headers, expected: 201 });
  assert.equal(duplicate.case_id, created.case_id, 'Idempotency state was not preserved across requests');
  await request(`/v1/cases/${created.case_id}/review-queue`, { headers: { 'x-standby-session': session } });
  await request(`/v1/cases/${created.case_id}/review-queue`, { headers: { 'x-standby-session': randomUUID() }, expected: 404 });
  await request(`/v1/cases/${created.case_id}/review-queue`, { expected: 401 });

  if (values['upload-mib']) {
    const mib = Number(values['upload-mib']);
    assert.ok(Number.isInteger(mib) && mib >= 1 && mib <= 50, '--upload-mib must be 1..50');
    const bytes = Buffer.alloc(mib * 1024 * 1024, 0x20);
    bytes.write('%PDF-1.7\n% CONTROLLED_FIXTURE upload transport only\n');
    const form = new FormData();
    form.set('origin', 'CONTROLLED_FIXTURE');
    form.set('file', new Blob([bytes], { type: 'application/pdf' }), 'migration-transport.fixture.pdf');
    await request(`/v1/cases/${created.case_id}/sources/MASTER_CUE`, {
      method: 'POST', body: form, expected: 201,
      headers: { 'x-standby-session': session, 'idempotency-key': randomUUID() },
    });
  }
} else {
  assert.ok(!values['upload-mib'], '--upload-mib requires --allow-writes');
}

console.log(JSON.stringify({
  target: base, passed: true, commit: health.commit ?? null, evidence,
  limits: ['No paid AI call or real document was used.',
    'The optional PDF checks upload transport only; it is not a valid extraction document.',
    'These checks do not prove restart recovery, replica sharing, or long-running job completion.'],
}, null, 2));
