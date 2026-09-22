'use strict';

/**
 * Evidence Graph v0.1
 *
 * The graph is a deterministic projection of authoritative evidence.
 * It is not a source of truth and must be rebuildable without mutating
 * raw/canonical evidence.
 */

const NODE_TYPES = new Set([
  'BLOCK',
  'TRANSACTION',
  'CONTRACT',
  'EVENT',
  'POOL',
  'TOKEN',
  'WALLET',
  'FORMATION',
]);

const EDGE_TYPES = new Set([
  'CONTAINS',
  'EMITS',
  'CREATES',
  'ASSOCIATED_WITH',
  'OCCURS_IN',
  'REFERENCES',
  'FOLLOWS',
]);

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name.toUpperCase()}_REQUIRED`);
  }
}

function requireId(value, name) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`INVALID_${name.toUpperCase()}`);
  }
}

function nodeKey(type, id) {
  if (!NODE_TYPES.has(type)) throw new Error('INVALID_NODE_TYPE');
  requireId(id, 'node_id');
  return `${type}:${id}`;
}

function edgeKey(from, type, to) {
  if (!EDGE_TYPES.has(type)) throw new Error('INVALID_EDGE_TYPE');
  requireId(from, 'from');
  requireId(to, 'to');
  return `${from}|${type}|${to}`;
}

function createEvidenceGraph() {
  const nodes = new Map();
  const edges = new Map();

  function addNode(type, id, attributes = {}) {
    const key = nodeKey(type, id);
    const existing = nodes.get(key);
    const node = {
      id: id,
      type,
      attributes: { ...attributes },
    };

    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(node)) {
        throw new Error('GRAPH_NODE_CONFLICT');
      }
      return existing;
    }

    nodes.set(key, node);
    return node;
  }

  function addEdge(from, type, to, attributes = {}) {
    const key = edgeKey(from, type, to);
    const existing = edges.get(key);
    const edge = {
      from,
      type,
      to,
      attributes: { ...attributes },
    };

    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(edge)) {
        throw new Error('GRAPH_EDGE_CONFLICT');
      }
      return existing;
    }

    edges.set(key, edge);
    return edge;
  }

  function projectEvidence(evidence) {
    requireObject(evidence, 'evidence');

    requireId(evidence.evidence_id, 'evidence_id');
    if (evidence.evidence_type !== 'RAW_LOG') {
      throw new Error('UNSUPPORTED_EVIDENCE_TYPE');
    }

    const location = evidence.location;
    requireObject(location, 'location');
    requireId(location.transaction_hash, 'transaction_hash');
    requireId(location.block_hash, 'block_hash');
    requireId(evidence.contract_address, 'contract_address');

    const chain = String(evidence.chain_id);
    const blockId = `${chain}:${location.block_hash}`;
    const txId = `${chain}:${location.transaction_hash}`;
    const contractId = `${chain}:${evidence.contract_address}`;
    const eventId = evidence.evidence_id;

    addNode('BLOCK', blockId, {
      chain_id: evidence.chain_id,
      block_hash: location.block_hash,
      block_number: location.block_number,
    });
    addNode('TRANSACTION', txId, {
      chain_id: evidence.chain_id,
      transaction_hash: location.transaction_hash,
      transaction_index: location.transaction_index,
      block_hash: location.block_hash,
    });
    addNode('CONTRACT', contractId, {
      chain_id: evidence.chain_id,
      address: evidence.contract_address,
    });
    addNode('EVENT', eventId, {
      evidence_id: eventId,
      evidence_type: evidence.evidence_type,
      interpretation_status: evidence.interpretation_status,
      raw_reference: evidence.raw_reference,
      provenance_reference: evidence.provenance_reference,
    });

    addEdge(`BLOCK:${blockId}`, 'CONTAINS', `TRANSACTION:${txId}`);
    addEdge(`TRANSACTION:${txId}`, 'EMITS', `EVENT:${eventId}`);
    addEdge(`EVENT:${eventId}`, 'ASSOCIATED_WITH', `CONTRACT:${contractId}`);
    addEdge(`EVENT:${eventId}`, 'OCCURS_IN', `BLOCK:${blockId}`);

    return eventId;
  }

  function projectFormation(formation) {
    requireObject(formation, 'formation');
    requireId(formation.formation_id, 'formation_id');
    if (!Array.isArray(formation.evidence_ids)) {
      throw new Error('INVALID_EVIDENCE_IDS');
    }

    const formationId = formation.formation_id;
    addNode('FORMATION', formationId, {
      formation_type: formation.formation_type ?? null,
      formation_rule_version: formation.formation_rule_version ?? null,
      chain_id: formation.chain_id ?? null,
      formation_start: formation.formation_start ?? null,
      formation_end: formation.formation_end ?? null,
      state: formation.state ?? null,
    });

    for (const evidenceId of formation.evidence_ids) {
      requireId(evidenceId, 'evidence_id');
      const eventKey = `EVENT:${evidenceId}`;
      if (!nodes.has(eventKey)) {
        throw new Error('FORMATION_EVIDENCE_NOT_PROJECTED');
      }
      addEdge(`FORMATION:${formationId}`, 'REFERENCES', eventKey);
    }

    return formationId;
  }

  function toJSON() {
    return {
      version: '0.1',
      nodes: [...nodes.values()].sort((a, b) =>
        `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`)
      ),
      edges: [...edges.values()].sort((a, b) =>
        edgeKey(a.from, a.type, a.to).localeCompare(edgeKey(b.from, b.type, b.to))
      ),
    };
  }

  function count() {
    return { nodes: nodes.size, edges: edges.size };
  }

  return {
    addNode,
    addEdge,
    projectEvidence,
    projectFormation,
    toJSON,
    count,
  };
}

module.exports = {
  NODE_TYPES,
  EDGE_TYPES,
  createEvidenceGraph,
};
