'use strict';

function createFixtureProvider() {
  return Object.freeze({
    type: 'FIXTURE',
    version: 'fixture-v1',
    independence_class: 'I0',
    async observe(request) {
      return Object.freeze({
        payload: {
          fixture: true,
          subject: request.subject,
          provider_assertion: 'NON_AUTHORITATIVE'
        },
        observation_time: '2026-10-07T00:00:00Z',
        source_reference: 'fixture://reference-intelligence-v1',
        provenance: { source: 'controlled-fixture', acquisition: 'test-adapter' },
        completeness_status: 'COMPLETE',
        derivation_status: 'OBSERVED',
        independence_class: 'I0',
        lineage: { source_type: 'FIXTURE', parent_source_id: null }
      });
    }
  });
}

module.exports = { createFixtureProvider };
