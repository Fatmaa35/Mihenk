import { expect, test } from '@playwright/test'

test('public landing page presents the Mihenk story and login entry point', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Bir sonraki kitabın seni bekliyor/ })).toBeVisible()
  await expect(page.locator('.landing-visual img')).toBeVisible()
  await expect(page.locator('#landing-features article')).toHaveCount(4)
  await expect(page.locator('#auth-form')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Giriş yap', exact: true }).first()).toBeVisible()
})

test('login form is accessible and recovery opens', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldin' })).toBeVisible()
  const auth = page.locator('#auth-form')
  await expect(auth.getByLabel('E-posta')).toHaveAttribute('autocomplete', 'email')
  await expect(auth.locator('#auth-password')).toHaveAttribute('autocomplete', 'current-password')
  await page.getByRole('button', { name: 'Parolamı unuttum' }).click()
  await expect(page.getByRole('heading', { name: 'Parolanı yenile' })).toBeVisible()
})

test('invalid login preserves a generic error and can recover', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).first().click()
  const auth = page.locator('#auth-form')
  await auth.getByLabel('E-posta').fill('nobody@example.com')
  await auth.locator('#auth-password').fill('yanlis-parola')
  await auth.getByRole('button', { name: 'Giriş yap', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('E-posta veya parola hatalı')
  await expect(auth.getByRole('button', { name: 'Giriş yap', exact: true })).toBeEnabled()
})

test('login screen never restores a session without an explicit submit', async ({ page }) => {
  let bootstrapWasRequested = false
  await page.route('**/me/bootstrap', async route => {
    bootstrapWasRequested = true
    await route.fulfill({ status: 500, json: { detail: 'unexpected bootstrap' } })
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Bir sonraki kitabın seni bekliyor/ })).toBeVisible()
  await expect(page.locator('#auth-form')).not.toBeVisible()
  await expect(page.locator('#app')).toHaveClass(/hidden/)
  expect(bootstrapWasRequested).toBe(false)
})

test('assistant removes the thinking state when a response arrives', async ({ page }) => {
  await page.route('**/me/chat', route => route.fulfill({
    status: 200,
    json: { intent: 'general', answer: 'Test yanıtı hazır.', books: [], suggestions: [], session_id: 'test-session', pending_action: null },
  }))
  await page.goto('/')
  await page.locator('#app').evaluate(element => element.classList.remove('hidden'))
  await page.locator('#chat-panel').evaluate(element => element.classList.remove('hidden'))
  await page.locator('#chat-input').fill('Bir kitap anlat')
  await page.locator('#chat-form').evaluate((form: HTMLFormElement) => form.requestSubmit())
  await expect(page.locator('.chat-typing')).toHaveCount(0)
  await expect(page.locator('.chat-message.assistant')).toContainText('Test yanıtı hazır.')
  await expect(page.locator('#chat-form button')).toBeEnabled()
})
