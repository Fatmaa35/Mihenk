import { expect, test } from '@playwright/test'

test('landing page explains the product and runs a live demo without an account', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('ruh hâline göre')
  await expect(page).toHaveTitle(/Mihenk/)
  await page.getByRole('button', { name: 'Yağmurlu bir akşam için kısa ve gizemli' }).click()
  await expect(page.locator('.lp-demo__list li')).not.toHaveCount(0)
  await expect(page.getByText('yalnızca yazdığın cümleye dayanıyor')).toBeVisible()
  await page.getByRole('link', { name: 'Nasıl çalışır?' }).click()
  await expect(page.getByRole('heading', { name: 'Üç adımda doğru kitap' })).toBeInViewport()
  const faq = page.locator('.lp-faq__item').first()
  await faq.locator('summary').click()
  await expect(faq).toHaveAttribute('open', '')
  await page.getByRole('link', { name: 'Giriş yap' }).first().click()
  await expect(page).toHaveURL(/\/giris$/)
})

test('signed-in readers skip the landing page', async ({ page }) => {
  const email = `landing-${Date.now()}@mihenk.test`
  await page.request.post('/auth/register', { data: { display_name: 'Okur', email, password: 'DenemeParola123!' } })
  await page.goto('/')
  await expect(page).toHaveURL(/\/bugun$/)
})
