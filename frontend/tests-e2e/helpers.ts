import { APIRequestContext, expect, Page } from '@playwright/test'

/** Yeni bir okur hesabı açar; tarayıcı oturumu çerezlerle açık kalır. */
export async function signUp(page: Page, name = 'Deneme Okur') {
  const email = `e2e-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@mihenk.test`
  const response = await page.request.post('/auth/register', { data: { display_name: name, email, password: 'DenemeParola123!' } })
  expect(response.status()).toBe(201)
  return { email, password: 'DenemeParola123!' }
}

export async function firstBooks(request: APIRequestContext) {
  return (await (await request.get('/books')).json()) as { id: string; title: string }[]
}
