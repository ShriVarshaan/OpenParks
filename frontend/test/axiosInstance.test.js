import {describe, it, expect, vi, beforeEach} from 'vitest'
import axios from 'axios'
import API from '../src/api/axiosInstance'

vi.mock('axios', () => ({
    default: {
        create: vi.fn().mockReturnValue({
            interceptor: {
                request: {use: vi.fn()},
                Response: {use: vi.fn()},
            },
        }),
    },
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
    
    const interceptorFunction = axios.create().interceptors.request.use.mock.calls[0][0]
    const config = { headers: {} }
    const result = interceptorFunction(config)
    
    expect(result.headers.Authorization).toBe(`Bearer ${testToken}`)
  })

  it('does not add authorization header when no token', () => {
    const interceptorFunction = axios.create().interceptors.request.use.mock.calls[0][0]
    const config = { headers: {} }
    const result = interceptorFunction(config)
    
    expect(result.headers.Authorization).toBeUndefined()
  })

  it('returns the config object unchanged aside from headers', () => {
    const interceptorFunction = axios.create().interceptors.request.use.mock.calls[0][0]
    const originalConfig = { headers: { 'X-Custom': 'value' }, url: '/test' }
    const result = interceptorFunction(originalConfig)
    
    expect(result.url).toBe('/test')
    expect(result.headers['X-Custom']).toBe('value')
  })
})