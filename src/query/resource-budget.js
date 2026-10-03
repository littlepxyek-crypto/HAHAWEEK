'use strict';

const EQC_RESOURCE_BOUNDARY_VERSION = 'EQC-RESOURCE-1.0';
const DEFAULT_MAX_ROWS = 1000;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE_OFFSET = 100000;
const MAX_BLOCK_SPAN = 100000;
const MAX_TRAVERSAL_DEPTH = 3;
const MAX_EXECUTION_MS = 1000;

function requireNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) throw new TypeError(name.toUpperCase() + '_INVALID');
  return value;
}

function createResourceBudget(input = {}) {
  const pageSize = input.page_size === undefined ? MAX_PAGE_SIZE : requireNonNegativeInteger(input.page_size, 'page_size');
  const pageOffset = input.page_offset === undefined ? 0 : requireNonNegativeInteger(input.page_offset, 'page_offset');
  const depth = input.depth === undefined ? 0 : requireNonNegativeInteger(input.depth, 'depth');

  if (pageSize === 0 || pageSize > MAX_PAGE_SIZE) throw new RangeError('PAGE_SIZE_TOO_LARGE');
  if (pageOffset > MAX_PAGE_OFFSET) throw new RangeError('PAGE_OFFSET_TOO_LARGE');
  if (depth > MAX_TRAVERSAL_DEPTH) throw new RangeError('TRAVERSAL_DEPTH_TOO_LARGE');

  const startedAt = Date.now();
  const deadline = startedAt + MAX_EXECUTION_MS;
  return Object.freeze({
    version: EQC_RESOURCE_BOUNDARY_VERSION,
    max_rows: DEFAULT_MAX_ROWS,
    page_size: pageSize,
    page_offset: pageOffset,
    max_page_offset: MAX_PAGE_OFFSET,
    max_traversal_depth: MAX_TRAVERSAL_DEPTH,
    max_execution_ms: MAX_EXECUTION_MS,
    started_at: startedAt,
    deadline,
    check() {
      if (Date.now() > deadline) throw new Error('QUERY_RESOURCE_TIMEOUT');
    },
  });
}

function paginate(rows, budget) {
  budget.check();
  const start = budget.page_offset;
  const selected = rows.slice(start, start + budget.page_size);
  const hasMore = rows.length > start + budget.page_size;
  return {
    rows: selected,
    partial: rows.length > budget.max_rows,
    pagination: {
      page_size: budget.page_size,
      page_offset: start,
      next_page_offset: hasMore ? start + budget.page_size : null,
    },
  };
}

module.exports = {
  EQC_RESOURCE_BOUNDARY_VERSION,
  DEFAULT_MAX_ROWS,
  MAX_PAGE_SIZE,
  MAX_PAGE_OFFSET,
  MAX_BLOCK_SPAN,
  MAX_TRAVERSAL_DEPTH,
  MAX_EXECUTION_MS,
  createResourceBudget,
  paginate,
};
