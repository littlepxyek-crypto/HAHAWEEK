'use strict';

const {
  discoverPool,
} = require('./pool-discovery');

const {
  createFormationEvent,
} = require('./formation-event');

function discoverFormationEvent(log) {
  const pool = discoverPool(log);

  return createFormationEvent(pool);
}

module.exports = {
  discoverFormationEvent,
};
