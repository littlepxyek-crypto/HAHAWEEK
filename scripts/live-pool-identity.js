'use strict';

const { createProvider } = require('../src/core/rpc');

const {
  TOPIC0,
  decodeInitializeLog,
} = require('../src/core/initialize-decoder');

const {
  CHAIN_ID,
  POOL_MANAGER,
  discoverPool,
} = require('../src/core/pool-discovery');

const {
  createPoolIdentity,
} = require('../src/core/pool-identity');

(async () => {
  const provider = createProvider();

  try {
    const network = await provider.getNetwork();
    const actualChainId = Number(network.chainId);

    if (actualChainId !== CHAIN_ID) {
      throw new Error(
        `CHAIN_ID_MISMATCH:${actualChainId}`
      );
    }

    const latest = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latest - 1000);
    const toBlock = latest;

    console.log('=== LIVE POOL IDENTITY GATE ===');
    console.log('Chain ID:', actualChainId);
    console.log('PoolManager:', POOL_MANAGER);
    console.log('Initialize topic0:', TOPIC0);
    console.log('Scanned:', fromBlock, '->', toBlock);

    const logs = await provider.getLogs({
      address: POOL_MANAGER,
      topics: [TOPIC0],
      fromBlock,
      toBlock,
    });

    console.log('Initialize logs:', logs.length);

    if (logs.length === 0) {
      throw new Error(
        'NO_INITIALIZE_EVENTS_IN_RANGE'
      );
    }

    const sample = logs[logs.length - 1];

    console.log('\n=== RAW EVENT ===');
    console.log('Block:', sample.blockNumber);
    console.log('Transaction:', sample.transactionHash);
    console.log(
      'Log index:',
      sample.index ?? sample.logIndex
    );
    console.log('Topics:', sample.topics.length);
    console.log(
      'Data bytes:',
      (sample.data.length - 2) / 2
    );

    const decoded = decodeInitializeLog(sample);
    const discovered = discoverPool(sample);

    const identity = createPoolIdentity({
      chainId: discovered.chainId,
      poolId: discovered.poolId,
      currency0: discovered.currency0,
      currency1: discovered.currency1,
    });

    console.log('\n=== DISCOVERED POOL ===');
    console.log('Pool ID:', discovered.poolId);
    console.log('Currency0:', discovered.currency0);
    console.log('Currency1:', discovered.currency1);
    console.log('Fee:', discovered.fee);
    console.log('Tick spacing:', discovered.tickSpacing);
    console.log('Hooks:', discovered.hooks);
    console.log('SqrtPriceX96:', discovered.sqrtPriceX96);
    console.log('Tick:', discovered.tick);

    console.log('\n=== IDENTITY ===');
    console.log('Canonical ID:', identity.canonicalId);
    console.log('Canonical Pair:', identity.canonicalPair);

    if (
      discovered.poolId.toLowerCase() !==
      decoded.poolId.toLowerCase()
    ) {
      throw new Error(
        'POOL_ID_PROVENANCE_MISMATCH'
      );
    }

    if (
      identity.canonicalId !==
      `${CHAIN_ID}:${decoded.poolId.toLowerCase()}`
    ) {
      throw new Error(
        'CANONICAL_ID_MISMATCH'
      );
    }

    if (
      identity.currency0.address !==
      discovered.currency0.toLowerCase()
    ) {
      throw new Error(
        'CURRENCY0_IDENTITY_MISMATCH'
      );
    }

    if (
      identity.currency1.address !==
      discovered.currency1.toLowerCase()
    ) {
      throw new Error(
        'CURRENCY1_IDENTITY_MISMATCH'
      );
    }

    if (
      discovered.transactionHash.toLowerCase() !==
      sample.transactionHash.toLowerCase()
    ) {
      throw new Error(
        'TRANSACTION_PROVENANCE_MISMATCH'
      );
    }

    if (
      discovered.logIndex !==
      (sample.index ?? sample.logIndex)
    ) {
      throw new Error(
        'LOG_INDEX_PROVENANCE_MISMATCH'
      );
    }

    console.log('\nLIVE POOL IDENTITY: OK');
    console.log(
      'RAW -> DECODE -> DISCOVERY -> IDENTITY: OK'
    );

  } finally {
    provider.destroy();
  }
})().catch((error) => {
  console.error('\nLIVE POOL IDENTITY: FAILED');
  console.error(error.message);
  process.exitCode = 1;
});
