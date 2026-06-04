import { request } from './http.js'

export async function login(login, password) {
  const res = await request('/api/user/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  })

  const data = res.data ?? {}
  const user = data.user ?? {}

  return {
    token: data.access_token,
    refreshTtl: data.refresh_ttl,
    user: {
      id: user.id,
      username: user.mobile || user.username,
      nickName: user.nickname || user.username || user.mobile,
      isLeader: user.is_leader === 1,
    },
  }
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
