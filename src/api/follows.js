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

export function unfollow() {
  return request('/api/follows/me', { method: 'DELETE' })
}
