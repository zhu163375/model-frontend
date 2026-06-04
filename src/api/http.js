const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function extractErrorMessage(data, fallback) {
  if (!data || typeof data !== 'object') return fallback
  if (typeof data.msg === 'string' && data.msg) return data.msg
  if (typeof data.message === 'string' && data.message) return data.message
  return fallback
}

export async function request(path, options = {}) {
  const headers = { ...options.headers }

  const token = localStorage.getItem('auth_token')
  if (token) {
    headers.token = token
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

  const envelopeStatus =
    data && typeof data.status === 'number' ? data.status : null
  const businessFailed =
    envelopeStatus !== null && envelopeStatus !== 200

  if (!response.ok || businessFailed) {
    const status = envelopeStatus ?? response.status
    throw new ApiError(
      extractErrorMessage(data, response.statusText || '请求失败'),
      status,
    )
  }

  return data
}
