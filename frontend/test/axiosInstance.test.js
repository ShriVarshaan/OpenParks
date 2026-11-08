import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

test('defaults to the local backend when VITE_API_URL is not set', async () => {
  vi.stubEnv('VITE_API_URL', '')
  vi.resetModules()

  const { default: API } = await import('../src/api/axiosInstance')

  expect(API.defaults.baseURL).toBe('http://localhost:3000')
})

test('uses VITE_API_URL when it is set', async () => {
  vi.stubEnv('VITE_API_URL', 'https://api.example.test')
  vi.resetModules()

  const { default: API } = await import('../src/api/axiosInstance')

  expect(API.defaults.baseURL).toBe('https://api.example.test')
})
