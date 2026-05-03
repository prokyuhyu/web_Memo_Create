import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1' })

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Single in-flight refresh promise to prevent parallel refresh races
let refreshPromise: Promise<string> | null = null

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config

    if (err.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        if (!refreshPromise) {
          const refreshToken = localStorage.getItem('refreshToken')
          if (!refreshToken) throw new Error('no refresh token')

          refreshPromise = axios
            .post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>(
              '/api/v1/auth/refresh',
              { refreshToken },
            )
            .then((r) => {
              const { accessToken, refreshToken: newRefresh } = r.data.data
              localStorage.setItem('accessToken', accessToken)
              localStorage.setItem('refreshToken', newRefresh)
              refreshPromise = null
              return accessToken
            })
            .catch((e) => {
              refreshPromise = null
              throw e
            })
        }

        const newToken = await refreshPromise
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('lastSyncedAt')
        window.location.href = '/login'
        return Promise.reject(err)
      }
    }

    return Promise.reject(err)
  },
)

export default api
