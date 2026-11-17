// Reads the user id from the JWT stored at login. The token is not verified here:
// this only decides what the UI shows, and the API still enforces every permission.
export function getUserIdFromToken(token) {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const { id } = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')))
    return id == null ? null : Number(id)
  } catch {
    return null
  }
}
