import { describe, expect, it } from 'vitest'
import { getUserIdFromToken } from '../src/utils/auth'

// Builds an unsigned JWT-shaped string; only the payload matters to the helper.
const tokenWith = (payload) => {
  const encode = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('getUserIdFromToken', () => {
  it('returns the numeric user id from the token payload', () => {
    expect(getUserIdFromToken(tokenWith({ id: 42 }))).toBe(42)
  })

  it('reads payloads that use base64url characters', () => {
    // "~~~" encodes to "fn5+" in base64, which base64url writes as "fn5-".
    expect(getUserIdFromToken(tokenWith({ id: 7, name: '~~~?' }))).toBe(7)
  })

  it('returns null when there is no token', () => {
    expect(getUserIdFromToken(null)).toBeNull()
  })

  it('returns null for a malformed token', () => {
    expect(getUserIdFromToken('not-a-jwt')).toBeNull()
  })

  it('returns null when the payload has no id', () => {
    expect(getUserIdFromToken(tokenWith({ sub: 'x' }))).toBeNull()
  })
})
