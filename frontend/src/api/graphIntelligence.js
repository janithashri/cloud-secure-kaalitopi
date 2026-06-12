/**
 * Graph Intelligence API client.
 *
 * Follows the same pattern as the existing api/graph.js and api/findings.js
 * files: each function accepts an `api` (axios instance) and returns a Promise
 * that resolves to the response data.
 */

/**
 * Fetch graph-intelligence results for a provider.
 *
 * GET /api/v1/providers/{providerId}/graph-intelligence/
 *
 * @returns {{ high_risk_nodes: object[], shadow_risks: object[], summary: object }}
 */
export function getGraphIntelligence(api, providerId) {
  return api
    .get(`/api/v1/providers/${providerId}/graph-intelligence/`)
    .then((res) => res.data);
}

/**
 * Trigger an on-demand graph analysis run for a provider.
 *
 * POST /api/v1/providers/{providerId}/graph-intelligence/run/
 *
 * @returns {{ status: string, task_id: string }}
 */
export function runGraphAnalysis(api, providerId) {
  return api
    .post(`/api/v1/providers/${providerId}/graph-intelligence/run/`)
    .then((res) => res.data);
}
