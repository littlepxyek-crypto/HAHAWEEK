'use strict';

const { ReferenceGateway } = require('./reference-gateway');
const { OBSERVATION_STATUS, INDEPENDENCE_CLASSES, createReferenceObservation,
  transitionReferenceObservation, isUncertainObservationStatus } = require('./reference-observation');
const { ControlledFixtureProvider } = require('./providers/controlled-fixture');

module.exports = {
  ReferenceGateway, ControlledFixtureProvider, OBSERVATION_STATUS, INDEPENDENCE_CLASSES,
  createReferenceObservation, transitionReferenceObservation, isUncertainObservationStatus,
};
