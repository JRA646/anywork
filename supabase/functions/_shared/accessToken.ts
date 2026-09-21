const encoder = new TextEncoder()

const base64UrlEncode = (value: string) =>
  btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')

const base64UrlDecode = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  return atob(padded)
}

const sign = async (payload: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))
}

export const createAccessToken = async (requestId: string, ttlSeconds = 60 * 60 * 24 * 30) => {
  const secret = Deno.env.get('ANYWORK_ACCESS_TOKEN_SECRET')
  if (!secret) throw new Error('Guest request access is not configured.')

  const payload = base64UrlEncode(JSON.stringify({
    sub: requestId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    iat: Math.floor(Date.now() / 1000),
  }))
  const signature = await sign(payload, secret)
  return payload + '.' + signature
}

export const verifyAccessToken = async (token: string) => {
  const secret = Deno.env.get('ANYWORK_ACCESS_TOKEN_SECRET')
  if (!secret) throw new Error('Guest request access is not configured.')

  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const normalized = signature.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const signatureBytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))

  const valid = await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payload))
  if (!valid) return null

  const parsed = JSON.parse(base64UrlDecode(payload)) as { sub?: string; exp?: number }
  if (!parsed.sub || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null
  return parsed
}
