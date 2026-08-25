import { expect, test } from '@playwright/test'

const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test.describe('authenticated reading flow', () => {
  test.skip(!email || !password, 'E2E_EMAIL ve E2E_PASSWORD tanımlanmalıdır.')

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Giriş yap', exact: true }).first().click()
    const auth = page.locator('#auth-form')
    await auth.getByLabel('E-posta').fill(email!)
    await auth.locator('#auth-password').fill(password!)
    await auth.getByRole('button', { name: 'Giriş yap', exact: true }).click()
    await expect(page.locator('#app-shell')).toBeVisible()
  })

  test('profile-backed Reading Mode renders a 365-day calendar', async ({ page }) => {
    await page.locator('[data-view="reading-mode"]').click()
    await expect(page.getByRole('region', { name: 'Okuma Modu ve PKM Paneli' })).toBeVisible()
    await expect(page.locator('.heatmap-grid .heatmap-cell')).toHaveCount(365)
    await expect(page.locator('.annual-goal')).toBeVisible()
  })

  test('authenticated ISBN import endpoint is protected by the active session', async ({ page }) => {
    const response = await page.request.post('/me/books/isbn/gecersiz')
    expect(response.status()).not.toBe(401)
    expect([400, 404]).toContain(response.status())
  })

  test('top-left Mihenk logo returns to the Discover home', async ({ page }) => {
    await page.locator('[data-view="catalog"]').click()
    await expect(page).toHaveTitle('Katalog · Mihenk')
    await page.getByRole('button', { name: 'Mihenk ana sayfasına git' }).click()
    await expect(page).toHaveTitle('Keşfet · Mihenk')
    await expect(page.locator('#discover-view')).toBeVisible()
  })

  test('reloading restores the authenticated session', async ({ page }) => {
    await page.reload()
    await expect(page.locator('#app-shell')).toBeVisible()
    await expect(page.locator('#app')).not.toHaveClass(/hidden/)
  })

})
