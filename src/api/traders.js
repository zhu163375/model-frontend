import { request } from './http.js'

export function listTraders() {
  return request('/api/traders')
}

export function listMyFollowers() {
  return request('/api/traders/me/followers')
}

export function removeFollower(followRecordId) {
  return request(`/api/traders/me/followers/${followRecordId}`, {
    method: 'DELETE',
  })
}

export function listPendingRequests() {
  return request('/api/traders/me/requests')
}

export function approveRequest(requestId) {
  return request(`/api/traders/me/requests/${requestId}/approve`, {
    method: 'POST',
  })
}

export function rejectRequest(requestId) {
  return request(`/api/traders/me/requests/${requestId}/reject`, {
    method: 'POST',
  })
}
