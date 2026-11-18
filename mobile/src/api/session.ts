import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Oturum anahtarlarının saklandığı yer. Telefonda anahtarlar işletim sisteminin
 * güvenli deposunda (Android Keystore) tutulur; web'de güvenli depo olmadığı
 * için yalnızca bellekte kalır, bu da geliştirme sırasında yeterlidir.
 */

const ACCESS_KEY = 'mihenk_access_token'
const REFRESH_KEY = 'mihenk_refresh_token'

export type Tokens = { access: string | null; refresh: string | null }

const memory: Tokens = { access: null, refresh: null }
const secure = Platform.OS !== 'web'

async function read(key: string): Promise<string | null> {
  if (!secure) return key === ACCESS_KEY ? memory.access : memory.refresh
  try {
    return await SecureStore.getItemAsync(key)
  } catch {
    return null
  }
}

async function write(key: string, value: string | null): Promise<void> {
  if (!secure) {
    if (key === ACCESS_KEY) memory.access = value
    else memory.refresh = value
    return
  }
  try {
    if (value) await SecureStore.setItemAsync(key, value)
    else await SecureStore.deleteItemAsync(key)
  } catch {
    // Güvenli depoya yazılamazsa oturum bu açılışla sınırlı kalır.
  }
}

export async function readTokens(): Promise<Tokens> {
  const [access, refresh] = await Promise.all([read(ACCESS_KEY), read(REFRESH_KEY)])
  return { access, refresh }
}

export async function writeTokens(tokens: Partial<Tokens>): Promise<void> {
  const writes: Promise<void>[] = []
  if (tokens.access !== undefined) writes.push(write(ACCESS_KEY, tokens.access))
  if (tokens.refresh !== undefined) writes.push(write(REFRESH_KEY, tokens.refresh))
  await Promise.all(writes)
}

export async function clearTokens(): Promise<void> {
  await writeTokens({ access: null, refresh: null })
}
