'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { createLegacyWriteBarrier } = require('../src/core/legacy-write-freeze');
const { createDatabase } = require('../src/core/database');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-db-boundary-'));
}

test('H-01 rejects direct database handle mutation after freeze', async () => {
  const dir = tempDir();
  const barrier = createLegacyWriteBarrier({
    filename: path.join(dir, 'legacy-write-state.json'),
  });
  const database = await createDatabase(':memory:', {
    legacyWriteBarrier: barrier,
  });

  database.db.run(
    "INSERT INTO schema_meta (key, value) VALUES ('before', 'ok')"
  );

  barrier.freeze();

  assert.throws(
    () =>
      database.db.run(
        "INSERT INTO schema_meta (key, value) VALUES ('blocked', 'no')"
      ),
    /LEGACY_WRITES_FROZEN/
  );

  assert.equal(
    database.db.exec(
      "SELECT COUNT(*) FROM schema_meta WHERE key = 'blocked'"
    )[0].values[0][0],
    0
  );

  database.db.exec('SELECT 1');
});
