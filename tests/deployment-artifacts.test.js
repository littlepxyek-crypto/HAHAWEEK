'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('deployment baseline is persistent and fail-closed', () => {
  const dockerfile = fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8');
  const compose = fs.readFileSync(path.join(root, 'deploy/docker-compose.yml'), 'utf8');
  const systemd = fs.readFileSync(path.join(root, 'deploy/systemd/hahaweek.service'), 'utf8');

  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /VOLUME \["\/app\/data"\]/);
  assert.match(dockerfile, /HEALTHCHECK/);

  assert.match(compose, /RPC_URL:\s*\$\{RPC_URL:\?/);
  assert.match(compose, /hahaweek-data:\s*\/app\/data/);
  assert.match(compose, /read_only:\s*true/);
  assert.match(compose, /no-new-privileges:true/);
  assert.match(compose, /cap_drop:/);

  assert.match(systemd, /Restart=always/);
  assert.match(systemd, /ReadWritePaths=\/opt\/hahaweek\/data/);
  assert.match(systemd, /NoNewPrivileges=true/);
});
