import { expect, test } from '@playwright/test'
import { signUp } from './helpers'

test('year in review shows story cards and exports the current card as a PNG', async ({ page }) => {
  await signUp(page, 'Özet Okur')
  await page.request.put('/me/library', { data: { book_id: 'suc-ve-ceza', shelf: 'reading', current_page: 0, total_pages: 600 } })
  await page.request.put('/me/library', { data: { book_id: 'suc-ve-ceza', shelf: 'reading', current_page: 140, total_pages: 600 } })

  await page.goto('/profil')
  await page.getByRole('link', { name: /okuma yılın/ }).click()
  await expect(page).toHaveURL(/\/ozet\?yil=\d{4}$/)
  await expect(page.getByText(/okuma\s*yılın/).first()).toBeVisible()
  await page.getByRole('button', { name: 'İleri' }).click()
  await expect(page.getByText('Bu yıl okuduğun')).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Bu kartı paylaş' }).click()
  expect((await download).suggestedFilename()).toMatch(/^mihenk-\d{4}-pages\.png$/)
})

test('a saved quote becomes a downloadable card', async ({ page }) => {
  await signUp(page, 'Alıntı Okur')
  await page.request.put('/me/library', { data: { book_id: 'martin-eden', shelf: 'reading' } })

  await page.goto('/kitapligim')
  await page.getByRole('link', { name: 'Alıntılarım' }).click()
  await page.getByLabel('Kitap', { exact: true }).selectOption('martin-eden')
  await page.getByLabel('Alıntı', { exact: true }).fill('İnsan kendi başına bir dünyadır.')
  await page.getByRole('button', { name: 'Kaydet ve kart yap' }).click()
  await expect(page.getByRole('button', { name: /İnsan kendi başına bir dünyadır/ })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Gece' }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PNG indir' }).click()
  expect((await download).suggestedFilename()).toBe('mihenk-alinti-martin-eden.png')
})

test('a newly earned badge is celebrated once', async ({ page }) => {
  await signUp(page, 'Rozet Okur')
  await page.goto('/bugun')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const comment = await page.request.post('/me/book-comments', { data: { book_id: 'frankenstein', content: 'Yalnızlık üzerine unutulmaz bir roman.', contains_spoiler: false } })
  expect(comment.status()).toBe(201)
  await page.goto('/profil')
  const dialog = page.getByRole('dialog', { name: 'İlk İzlenim' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Yeni rozet kazandın!')).toBeVisible()
  await dialog.getByRole('button', { name: /Harika!|Sıradaki rozet/ }).click()
  if (await dialog.isVisible()) await dialog.getByRole('button', { name: /Harika!|Sıradaki rozet/ }).click()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Rozet rafın' })).toBeVisible()
  await expect(page.getByText('Yeni rozet kazandın!')).toBeHidden()
})
