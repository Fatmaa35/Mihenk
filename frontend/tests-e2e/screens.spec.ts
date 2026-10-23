import { expect, test } from '@playwright/test'
import { firstBooks, signUp } from './helpers'

test('every main screen renders for a new reader', async ({ page }) => {
  await signUp(page)
  const screens: [string, string][] = [
    ['/bugun', 'Deneme'], ['/kesfet', 'Keşfet'], ['/kitapligim', 'Kitaplığım'], ['/topluluk', 'Topluluk'],
    ['/odak', 'Okuma modu'], ['/profil', 'Deneme Okur'], ['/bildirimler', 'Bildirimler'], ['/ayarlar', 'Ayarlar'],
  ]
  for (const [path, heading] of screens) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading)
  }
  await page.goto('/yonetim')
  await expect(page.getByRole('heading', { name: 'Bu bölüm yöneticilere özel' })).toBeVisible()
})

test('a reader can rate, comment and set a price alert from the book detail', async ({ page }) => {
  await signUp(page)
  const [book] = await firstBooks(page.request)
  await page.goto('/kesfet')
  await page.locator('.book-card', { hasText: book.title }).getByRole('button', { name: `${book.title} ayrıntılarını aç` }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Hedef fiyat (TL)').fill('99.90')
  await dialog.getByRole('button', { name: 'Alarm kur' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'fiyat alarmı kuruldu' })).toBeVisible()

  await dialog.getByRole('tab', { name: /Puan ve yorumlar/ }).click()
  await dialog.getByRole('radio', { name: '4 yıldız' }).click()
  const text = `Uçtan uca test yorumu ${Date.now()}`
  await dialog.getByLabel('Yorumun').fill(text)
  await dialog.getByRole('button', { name: 'Paylaş' }).click()
  await expect(dialog.locator('.comment', { hasText: text })).toBeVisible()
  await expect(dialog.getByRole('radio', { name: '4 yıldız' })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')

  await page.goto('/bildirimler?sekme=alarmlar')
  await expect(page.locator('.alert-row', { hasText: book.title })).toContainText('99,90')
})

test('settings switch the theme and persist it across reloads', async ({ page }) => {
  await signUp(page)
  await page.goto('/ayarlar')
  await page.getByText('Koyu', { exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByText('Sistem', { exact: true }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/)
})

test('the assistant answers and clears its thinking state', async ({ page }) => {
  await signUp(page)
  await page.route('**/me/chat', (route) => route.fulfill({
    json: { intent: 'general', answer: 'Test yanıtı hazır.', books: [], suggestions: ['Başka öner'], session_id: null, pending_action: null },
  }))
  await page.goto('/bugun')
  await page.getByRole('button', { name: 'Kitap asistanı' }).click()
  await page.getByLabel('Asistana yaz').fill('Bir kitap anlat')
  await page.getByLabel('Asistana yaz').press('Enter')
  await expect(page.locator('.chat-message--assistant').last()).toContainText('Test yanıtı hazır.')
  await expect(page.locator('.chat-message--typing')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Başka öner' })).toBeVisible()
})
