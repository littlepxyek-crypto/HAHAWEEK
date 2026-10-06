'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createWriterFence } = require('../src/core/single-writer-fence');

test('writer fence creates a missing parent directory before acquiring its lock', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hahaweek-writer-fence-'));
  const filename = path.join(root, 'nested', 'data', 'writer-fence-state.json');
  const fence = createWriterFence({ filename, leaseMs: 5000, ownerId: 'test-owner' });

  try {
    assert.equal(fs.existsSync(path.dirname(filename)), false);
    const acquired = fence.acquire();

    assert.equal(acquired.fence, 1);
    assert.equal(fs.existsSync(filename), true);
    assert.equal(fs.existsSync(filename + '.lock'), false);
    assert.doesNotThrow(() => fence.assertOwned());
  } finally {
    fence.release();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
