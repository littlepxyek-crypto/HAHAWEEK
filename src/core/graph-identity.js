'use strict';

const crypto = require('node:crypto');

const GRAPH_IDENTITY_SCHEMA_VERSION = '1';
const GRAPH_NODE_DOMAIN = 'HAHAWEEK-EVIDENCE-V4-GRAPH-NODE';
const GRAPH_EDGE_DOMAIN = 'HAHAWEEK-EVIDENCE-V4-GRAPH-EDGE';

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(canonicalize);

  const output = {};
  for (const key of Object.keys(value).sort()) {
    const item = value[key];
    if (item === undefined) continue;
    output[key] = canonicalize(item);
  }
  return output;
}

function canonicalBytes(value) {
  return Buffer.from(JSON.stringify(canonicalize(value)), 'utf8');
}

function digest(domain, object) {
  return crypto.createHash('sha256')
    .update(Buffer.from(domain, 'utf8'))
    .update(Buffer.from([0]))
    .update(canonicalBytes(object))
    .digest('hex');
}

function requireString(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${name.toUpperCase()}_REQUIRED`);
  }
}

function graphNodeIdentity(type, id, scope = {}) {
  requireString(type, 'node_type');
  requireString(id, 'node_id');

  const object = {
    schema_version: GRAPH_IDENTITY_SCHEMA_VERSION,
    graph_identity_kind: 'NODE',
    node_type: type,
    node_id: id,
    scope,
  };

  return {
    schema_version: GRAPH_IDENTITY_SCHEMA_VERSION,
    domain: GRAPH_NODE_DOMAIN,
    algorithm: 'SHA-256',
    canonical_object: object,
    identity: digest(GRAPH_NODE_DOMAIN, object),
  };
}

function graphEdgeIdentity(from, type, to, scope = {}) {
  requireString(from, 'from');
  requireString(type, 'edge_type');
  requireString(to, 'to');

  const object = {
    schema_version: GRAPH_IDENTITY_SCHEMA_VERSION,
    graph_identity_kind: 'EDGE',
    from,
    edge_type: type,
    to,
    scope,
  };

  return {
    schema_version: GRAPH_IDENTITY_SCHEMA_VERSION,
    domain: GRAPH_EDGE_DOMAIN,
    algorithm: 'SHA-256',
    canonical_object: object,
    identity: digest(GRAPH_EDGE_DOMAIN, object),
  };
}

module.exports = {
  GRAPH_IDENTITY_SCHEMA_VERSION,
  GRAPH_NODE_DOMAIN,
  GRAPH_EDGE_DOMAIN,
  canonicalize,
  graphNodeIdentity,
  graphEdgeIdentity,
};
