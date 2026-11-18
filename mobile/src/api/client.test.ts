/** Mobil oturumun taşınma biçimi: başlıklar, anahtar yenileme ve oturum düşmesi. */
import { api, ApiError, authenticate, onSessionExpired } from './client'
import { readTokens, writeTokens } from './session'
import { __reset } from '../test/mocks/expo-secure-store'

type Call = { url: string; init: RequestInit }

const calls: Call[] = []

function respond(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function mockFetch(responder: (call: Call) => Response | Promise<Response>) {
  global.fetch = ((url: string, init: RequestInit = {}) => {
    const call = { url, init }
    calls.push(call)
    return Promise.resolve(responder(call))
  }) as unknown as typeof fetch
}

const headerOf = (name: string, index = 0) => new Headers(calls[index].init.headers).get(name)

beforeEach(async () => {
  calls.length = 0
  __reset()
  await writeTokens({ access: null, refresh: null })
})

describe('api', () => {
  it('her isteğe mobil istemci başlığını ve taşıdığı anahtarları koyar', async () => {
    await writeTokens({ access: 'erisim', refresh: 'yenileme' })
    mockFetch(() => respond(200, { ok: true }))

    await api('/me/bootstrap')

    expect(calls[0].url).toBe('https://test.mihenk/me/bootstrap')
    expect(headerOf('X-Mihenk-Client')).toBe('mobile')
    expect(headerOf('Authorization')).toBe('Bearer erisim')
    expect(headerOf('x-refresh-token')).toBe('yenileme')
  })

  it('sunucu anahtarı yenilediğinde yenisini güvenli depoya yazar', async () => {
    await writeTokens({ access: 'eski', refresh: 'eski-yenileme' })
    mockFetch(() => respond(200, {}, {
      'X-Session-Access-Token': 'yeni', 'X-Session-Refresh-Token': 'yeni-yenileme',
    }))

    await api('/me/bootstrap')

    expect(await readTokens()).toEqual({ access: 'yeni', refresh: 'yeni-yenileme' })
  })

  it('oturum düşerse anahtarları siler ve dinleyenlere haber verir', async () => {
    await writeTokens({ access: 'erisim' })
    let expired = false
    const stop = onSessionExpired(() => { expired = true })
    mockFetch(() => respond(401, { detail: 'Oturum açmanız gerekiyor.' }))

    await expect(api('/me/bootstrap')).rejects.toBeInstanceOf(ApiError)
    expect(expired).toBe(true)
    expect(await readTokens()).toEqual({ access: null, refresh: null })
    stop()
  })

  it('sunucunun Türkçe hata mesajını olduğu gibi gösterir', async () => {
    mockFetch(() => respond(400, { detail: 'Parola en az sekiz karakter olmalı.' }))
    await expect(api('/auth/login', { method: 'POST', body: '{}' }))
      .rejects.toThrow('Parola en az sekiz karakter olmalı.')
  })

  it('ağ kopukluğunu anlaşılır bir mesaja çevirir', async () => {
    global.fetch = (() => Promise.reject(new TypeError('Network request failed'))) as unknown as typeof fetch
    await expect(api('/me/bootstrap')).rejects.toThrow('Sunucuya ulaşılamadı. Bağlantını kontrol et.')
  })

  it('204 yanıtında gövde okumaya çalışmaz', async () => {
    mockFetch(() => respond(204, null))
    await expect(api('/me/library/x', { method: 'DELETE' })).resolves.toBeUndefined()
  })
})

describe('authenticate', () => {
  it('girişte anahtarları yanıt başlıklarından alır', async () => {
    mockFetch(() => respond(200, { id: '1' }, {
      'X-Session-Access-Token': 'erisim', 'X-Session-Refresh-Token': 'yenileme',
    }))

    await authenticate('/auth/login', { email: 'a@b.c', password: 'en-az-sekiz' })

    expect(await readTokens()).toEqual({ access: 'erisim', refresh: 'yenileme' })
    expect(headerOf('X-Mihenk-Client')).toBe('mobile')
  })

  it('sunucu anahtar vermezse hata verir', async () => {
    mockFetch(() => respond(200, { id: '1' }))
    await expect(authenticate('/auth/login', {})).rejects.toThrow('Sunucu oturum anahtarı vermedi.')
  })
})
