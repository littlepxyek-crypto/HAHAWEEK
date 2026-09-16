'use strict';

const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000';

function normalizeAddress(address) {
  if (typeof address !== 'string') {
    throw new Error('INVALID_CURRENCY_ADDRESS');
  }

  const value = address.toLowerCase();

  if (!/^0x[0-9a-f]{40}$/.test(value)) {
    throw new Error('INVALID_CURRENCY_ADDRESS');
  }

  return value;
}

function normalizeCurrency(address) {
  const normalized = normalizeAddress(address);

  if (normalized === ZERO_ADDRESS) {
    return {
      kind: 'NATIVE_ETH',
      address: ZERO_ADDRESS,
      symbol: 'ETH',
    };
  }

  return {
    kind: 'TOKEN',
    address: normalized,
  };
}

function createPoolIdentity(pool) {
  if (!pool || typeof pool !== 'object') {
    throw new Error('INVALID_POOL');
  }

  if (!Number.isInteger(pool.chainId) || pool.chainId <= 0) {
    throw new Error('INVALID_CHAIN_ID');
  }

  if (
    typeof pool.poolId !== 'string' ||
    !/^0x[0-9a-fA-F]{64}$/.test(pool.poolId)
  ) {
    throw new Error('INVALID_POOL_ID');
  }

  const currency0 = normalizeCurrency(pool.currency0);
  const currency1 = normalizeCurrency(pool.currency1);

  return {
    chainId: pool.chainId,
    poolId: pool.poolId.toLowerCase(),

    canonicalId:
      `${pool.chainId}:${pool.poolId.toLowerCase()}`,

    currency0,
    currency1,

    canonicalPair:
      `${currency0.kind}:${currency0.address}|` +
      `${currency1.kind}:${currency1.address}`,
  };
}

module.exports = {
  ZERO_ADDRESS,
  normalizeAddress,
  normalizeCurrency,
  createPoolIdentity,
};
