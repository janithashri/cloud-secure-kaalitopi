export function getCartographyGraph(api, providerId, label = null) {
  const qs = label ? `?label=${encodeURIComponent(label)}` : "";
  return api
    .get(`/api/auth/providers/${providerId}/graph/cartography/${qs}`)
    .then((res) => res.data);
}

export function getAttackQueries(api) {
  return api.get("/api/auth/attack-engine/queries/").then((res) => res.data);
}

export function runAttackEngine(api, providerId) {
  return api
    .post(`/api/auth/providers/${providerId}/attack-engine/run/`)
    .then((res) => res.data);
}

export function getAttackQueryGraph(api, providerId, queryId) {
  return api
    .get(`/api/auth/providers/${providerId}/attack-engine/query/${queryId}/`)
    .then((res) => res.data);
}
