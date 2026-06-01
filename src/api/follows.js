import { request } from './http.js'

export function getMyFollow() {
  return request('/api/follows/me')
}

export function createFollow(traderId, followRatio) {
  return request('/api/follows', {
    method: 'POST',
    body: JSON.stringify({ traderId, followRatio }),
  })
}

export function unfollow(followRecordId) {
  return request(`/api/follows/me/${followRecordId}`, { method: 'DELETE' })
}

export function cancelPendingRequest(requestId) {
  return request(`/api/follows/me/requests/${requestId}`, { method: 'DELETE' })
}
