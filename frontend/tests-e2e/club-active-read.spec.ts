import { expect, test } from '@playwright/test'

test('switching the active club book updates the card, progress form and persisted selection', async ({ page }) => {
  const registered = await page.request.post('/auth/register', { data: {
    display_name: 'Club Test', email: `club-${Date.now()}-${Math.random()}@example.com`, password: 'safe-password',
  } })
  expect(registered.status()).toBe(201)
  const books = await (await page.request.get('/books')).json()
  const [oldBook, newBook] = books
  const created = await page.request.post('/me/book-clubs', { data: { name: 'Active Book Browser Test' } })
  expect(created.status()).toBe(201)
  const club = await created.json()
  const endpoint = `/me/book-clubs/${club.id}`
  expect((await page.request.put(`${endpoint}/reads`, { data: { book_id: oldBook.id, status: 'reading' } })).ok()).toBe(true)
  expect((await page.request.put(`${endpoint}/progress`, { data: { book_id: oldBook.id, current_page: 30, total_pages: 200 } })).ok()).toBe(true)
  await page.goto('/')
  await page.getByRole('button', { name: 'Kulübü Aç', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Kulübü Aç', exact: true }).click()
  const card = page.locator('.club-card-section').filter({ has: page.getByRole('heading', { name: 'Ayın Aktif Kitabı', exact: true }) })
  const assign = card.locator('select[name="book_id"]')
  await expect(card.locator('h4').first()).toHaveText(oldBook.title)
  await expect(page.locator('input[name="current_page"]:visible')).toHaveValue('30')
  await assign.selectOption(newBook.id)
  await card.getByRole('button', { name: 'Aktif Kitap Olarak Ata' }).click()
  await expect(card.locator('h4').first()).toHaveText(newBook.title)
  await expect(page.locator('input[name="current_page"]:visible')).toHaveValue('0')
  const saved = await (await page.request.get(endpoint)).json()
  expect(saved.active_read.book_id).toBe(newBook.id)
  expect(saved.reads.filter((r: { status: string }) => r.status === 'reading')).toHaveLength(1)
  await assign.selectOption(oldBook.id)
  await card.getByRole('button', { name: 'Aktif Kitap Olarak Ata' }).click()
  await expect(card.locator('h4').first()).toHaveText(oldBook.title)
  await expect(page.locator('input[name="current_page"]:visible')).toHaveValue('30')
  await page.reload()
  await page.getByRole('button', { name: 'Kulübü Aç', exact: true }).click()
  await expect(card.locator('h4').first()).toHaveText(oldBook.title)
})
