'use strict';

class ControlledFixtureProvider {
  constructor({ payload = { fixture: true }, delayMs = 0, failWith = null } = {}) {
    this.payload = payload;
    this.delayMs = delayMs;
    this.failWith = failWith;
  }

  async observe({ requestId, acquisitionId, subject, asOfTime }) {
    if (this.delayMs > 0) await new Promise(resolve => setTimeout(resolve, this.delayMs));
    if (this.failWith) throw Object.assign(new Error(this.failWith), { code: this.failWith });
    return {
      provider_type: 'CONTROLLED_FIXTURE',
      provider_version: '1.0.0',
      source_reference: 'fixture://reference-intelligence',
      observation_time: asOfTime,
      completeness_status: 'COMPLETE',
      derivation_status: 'DIRECT_PROVIDER_OBSERVATION',
      provenance: {
        source_id: 'fixture-source',
        source_type: 'CONTROLLED_FIXTURE',
        source_lineage_id: 'fixture-lineage',
        publisher: 'HAHAWEEK_TEST_FIXTURE',
        derived: false,
        independence_classification: 'I0_UNKNOWN',
      },
      provider_payload: Object.assign({}, this.payload, { request_id: requestId, acquisition_id: acquisitionId, subject }),
      status: 'OBSERVED',
    };
  }
}

module.exports = { ControlledFixtureProvider };
