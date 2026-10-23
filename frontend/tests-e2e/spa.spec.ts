import { expect, test } from '@playwright/test'

/** Yeni React arayüzü: kayıt → Bugün → Keşfet'ten kitap ekleme → Kitaplık → tema → çıkış. */
test('new reader can sign up, shelve a book and switch theme', async ({ page }) => {
  const email = `spa-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@mihenk.test`
  await page.goto('/')
  await page.getByRole('link', { name: 'Ücretsiz başla' }).first().click()
  await expect(page).toHaveURL(/\/giris\?mod=kayit$/)
  await expect(page.getByRole('tab', { name: 'Kayıt ol' })).toHaveAttribute('aria-selected', 'true')
  await page.getByLabel('Adın').fill('Deneme Okur')
  await page.getByLabel('E-posta').fill(email)
  await page.locator('input[name=password]').fill('DenemeParola123!')
  await page.getByRole('button', { name: 'Hesap oluştur' }).click()

  await expect(page).toHaveURL(/\/bugun$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Deneme')
  await expect(page).toHaveTitle('Bugün · Mihenk')

  await page.getByRole('link', { name: 'Keşfet' }).first().click()
  await expect(page).toHaveURL(/\/kesfet$/)
  await page.getByLabel('Katalogda ara').fill('Frankenstein')
  const card = page.locator('.book-card', { hasText: 'Frankenstein' })
  await card.getByRole('button', { name: 'Okuyacağım' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'okuyacakların rafına eklendi' })).toBeVisible()

  await page.getByRole("link", { name: /Kitaplık/ }).first().click()
  await page.getByRole('tab', { name: /Okuyacağım/ }).click()
  await expect(page.locator('.library-row', { hasText: 'Frankenstein' })).toBeVisible()

  const html = page.locator('html')
  const before = await html.getAttribute('data-theme')
  await page.getByRole('button', { name: /temaya geç/ }).first().click()
  await expect(html).not.toHaveAttribute('data-theme', before ?? '')

  await page.reload()
  await expect(page.locator('.library-row', { hasText: 'Frankenstein' })).toBeVisible()

  await page.getByRole('button', { name: /Profil menüsü/ }).first().click()
  await page.getByRole('menuitem', { name: 'Çıkış yap' }).click()
  await expect(page).toHaveURL(/\/giris$/)
})
