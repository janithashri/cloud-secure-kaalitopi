/**
 * Findings API — list, summary, suppress.
 * Use with useAuth().api (axios instance with token).
 */

export function getFindings(api, providerId, params = {}) {
  const q = new URLSearchParams(params).toString();
  const url = `/api/v1/providers/${providerId}/findings/${q ? `?${q}` : ""}`;
  return api.get(url).then((res) => res.data);
}

export function getFindingsSummary(api, providerId) {
  return api.get(`/api/v1/providers/${providerId}/findings/summary/`).then((res) => res.data);
}

export function suppressFinding(api, findingId) {
  return api.patch(`/api/v1/findings/${findingId}/suppress/`);
}
