'use strict';

function createFixtureProvider() {
  return Object.freeze({
    type: 'FIXTURE',
    version: 'fixture-v1',
    independence_class: 'I0',
    async observe(request) {
      return Object.freeze({
        fixture: true,
        subject: request.subject,
        provider_assertion: 'NON_AUTHORITATIVE'
      });
    }
  });
}

module.exports = { createFixtureProvider };
