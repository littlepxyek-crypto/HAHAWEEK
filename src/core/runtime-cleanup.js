'use strict';

async function cleanupResources(actions, onFailure = () => {}) {
  const failures = [];

  for (const [label, cleanup] of actions) {
    if (typeof cleanup !== 'function') continue;

    try {
      await cleanup();
    } catch (error) {
      const failure = { label, error };
      failures.push(failure);
      try {
        onFailure(label, error);
      } catch {
        // Reporting a cleanup error must not prevent later cleanup actions.
      }
    }
  }

  return failures;
}

module.exports = { cleanupResources };
