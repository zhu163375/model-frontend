const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function request(path, options = {}) {
  const headers = { ...options.headers }

  const token = localStorage.getItem('auth_token')
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const hasBody = options.body != null && options.body !== ''
  if (hasBody && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  let data = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    throw new ApiError(data?.message || response.statusText || '请求失败', response.status)
  }

  return data
}
