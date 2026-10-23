import { expect, test } from '@playwright/test'
import { signUp } from './helpers'

test('a personal (non-catalog) book accepts progress, favorite and removal', async ({ page }) => {
  await signUp(page)
  const created = await page.request.post('/me/custom-books', {
    data: { title: 'Kişisel Deneme Kitabı', author: 'Deneme Yazar', genre: 'Roman', shelf: 'reading', current_page: 10, total_pages: 300 },
  })
  expect(created.status()).toBe(201)

  await page.goto('/kitapligim')
  const row = page.locator('.library-row', { hasText: 'Kişisel Deneme Kitabı' })
  await expect(row).toContainText('10/300')

  await row.getByRole('button', { name: 'İlerleme gir' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Bulunduğun sayfa').fill('120')
  await dialog.getByRole('button', { name: 'Kaydet' }).click()
  await expect(page.getByText('İlerlemen kaydedildi.')).toBeVisible()
  await expect(dialog).toBeHidden()
  await expect(row).toContainText('120/300')

  await row.getByRole('button', { name: 'Favorilere ekle' }).click()
  await expect(row.getByRole('button', { name: 'Favorilerden çıkar' })).toBeVisible()

  await row.getByRole('button', { name: /kaldır/i }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: 'Kaldır' }).click()
  await expect(page.locator('.library-row', { hasText: 'Kişisel Deneme Kitabı' })).toHaveCount(0)
})
