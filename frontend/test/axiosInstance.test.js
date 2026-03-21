import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: {
          use: vi.fn()
        },
        response: {
          use: vi.fn()
        }
      }
    }))
  }
}))

describe('axiosInstance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('creates axios instance with baseURL localhost 3000', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://localhost:3000',
      withCredentials: true,
    })
  })

  it('adds bearer token to headers when token exists', () => {
    const testToken = 'test-jwt-token-123'
    localStorage.setItem('token', testToken)
    
    const createResult = axios.create()
    const interceptorCallback = createResult.interceptors.request.use.mock.calls[0][0]
    const config = { headers: {} }
    const result = interceptorCallback(config)
    
    expect(result.headers.Authorization).toBe(`Bearer ${testToken}`)
  })

  it('does not add authorization header when no token', () => {
    const createResult = axios.create()
    const interceptorCallback = createResult.interceptors.request.use.mock.calls[0][0]
    const config = { headers: {} }
    const result = interceptorCallback(config)
    
    expect(result.headers.Authorization).toBeUndefined()
  })

  it('returns the config object unchanged aside from headers', () => {
    const createResult = axios.create()
    const interceptorCallback = createResult.interceptors.request.use.mock.calls[0][0]
    const originalConfig = { headers: { 'X-Custom': 'value' }, url: '/test' }
    const result = interceptorCallback(originalConfig)
    
    expect(result.url).toBe('/test')
    expect(result.headers['X-Custom']).toBe('value')
  })
})