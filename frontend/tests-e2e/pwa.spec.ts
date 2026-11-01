import { expect, test } from '@playwright/test'
import { signUp } from './helpers'

test('the service worker controls every page and the app shell opens offline', async ({ page, context }) => {
  await signUp(page)
  await page.goto('/bugun')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await page.reload()
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/')
    return { scope: registration?.scope ?? '', controlled: Boolean(navigator.serviceWorker.controller) }
  })
  expect(new URL(scope.scope).pathname).toBe('/')
  expect(scope.controlled).toBe(true)

  await context.setOffline(true)
  await page.goto('/kesfet')
  // Kabuk önbellekten açılır; tarayıcının "bağlantı yok" sayfası değil, Mihenk görünür.
  await expect(page.locator('#root')).not.toBeEmpty()
  await expect(page).toHaveTitle(/Mihenk/)
  await context.setOffline(false)
})

test('settings explain how to install the app', async ({ page }) => {
  await signUp(page)
  await page.goto('/ayarlar')
  const section = page.getByRole('region', { name: 'Uygulama olarak kullan' })
  await expect(section).toBeVisible()
  await expect(section).toContainText(/ana ekran/i)
  const manifest = await page.request.get('/static/manifest.webmanifest')
  expect((await manifest.json()).display).toBe('standalone')
})
