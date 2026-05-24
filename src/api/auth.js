import { request } from './http.js'

export function login(account, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  })
}

export function getMe() {
  return request('/api/auth/me')
}

export function applyLeader() {
  return request('/api/auth/apply-leader', { method: 'POST' })
}

export function cancelLeader() {
  return request('/api/auth/cancel-leader', { method: 'POST' })
}
