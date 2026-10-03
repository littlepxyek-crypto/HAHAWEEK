'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createResourceBudget,
  MAX_PAGE_SIZE,
  MAX_PAGE_OFFSET,
  MAX_TRAVERSAL_DEPTH,
  paginate,
} = require('../src/query/resource-budget');

test('resource budget defaults are bounded', () => {
  const b = createResourceBudget();
  assert.equal(b.max_rows, 1000);
  assert.equal(b.page_size, 100);
  assert.equal(b.page_offset, 0);
  assert.equal(b.max_traversal_depth, 3);
});

test('resource budget rejects oversized page and traversal requests', () => {
  assert.throws(() => createResourceBudget({ page_size: MAX_PAGE_SIZE + 1 }), /PAGE_SIZE_TOO_LARGE/);
  assert.throws(() => createResourceBudget({ page_offset: MAX_PAGE_OFFSET + 1 }), /PAGE_OFFSET_TOO_LARGE/);
  assert.throws(() => createResourceBudget({ depth: MAX_TRAVERSAL_DEPTH + 1 }), /TRAVERSAL_DEPTH_TOO_LARGE/);
});

test('pagination is deterministic and exposes next page without touching V4 cursor', () => {
  const b = createResourceBudget({ page_size: 2, page_offset: 2 });
  const result = paginate(['a', 'b', 'c', 'd', 'e'], b);
  assert.deepEqual(result.rows, ['c', 'd']);
  assert.equal(result.pagination.next_page_offset, 4);
});
