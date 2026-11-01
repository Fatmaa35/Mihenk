import { expect, test } from '@playwright/test'
import { signUp } from './helpers'

test('friends meet in a live room: invite link, participant list and chat', async ({ browser, baseURL }) => {
  const hostContext = await browser.newContext({ baseURL })
  const guestContext = await browser.newContext({ baseURL })
  const host = await hostContext.newPage()
  const guest = await guestContext.newPage()
  await signUp(host, 'Ayşe Kurucu')
  await signUp(guest, 'Can Misafir')

  await host.goto('/topluluk')
  await host.getByRole('link', { name: 'Canlı odalar' }).click()
  await host.getByLabel('Odanın adı').fill('Final haftası')
  await host.getByRole('tab', { name: 'Ders çalışma' }).click()
  await host.getByRole('button', { name: 'Odayı aç' }).click()
  await expect(host.getByRole('heading', { level: 1, name: 'Final haftası' })).toBeVisible()
  await expect(host.getByText('Ders çalışma')).toBeVisible()

  // Davet bağlantısı odanın adresinden değil koddan oluşur; misafir bağlantıyla gelir.
  const roomUrl = new URL(host.url())
  const state = await host.request.get(`/me/live-rooms/${roomUrl.searchParams.get('oda')}`)
  const code = (await state.json()).room.invite_code as string
  await guest.goto(`/odalar?davet=${code}`)
  await expect(guest.getByRole('heading', { level: 1, name: 'Final haftası' })).toBeVisible()

  const people = host.getByRole('region', { name: /Odadakiler/ })
  await expect(people).toContainText('Can Misafir', { timeout: 10_000 })
  await expect(host.getByText(/Can Misafir odaya katıldı/)).toBeVisible({ timeout: 10_000 })

  await guest.getByLabel('Şu an ne yapıyorsun?').fill('Fizik, 3. ünite')
  await guest.getByRole('button', { name: 'Kaydet' }).click()
  await expect(people).toContainText('Fizik, 3. ünite', { timeout: 10_000 })

  await guest.getByLabel('Mesaj').fill('Selam, 25 dakika sonra mola?')
  await guest.getByRole('button', { name: 'Gönder' }).click()
  await expect(host.getByText('Selam, 25 dakika sonra mola?')).toBeVisible({ timeout: 10_000 })
  await host.getByLabel('Mesaj').fill('Olur, başlıyorum')
  await host.getByRole('button', { name: 'Gönder' }).click()
  await expect(guest.getByText('Olur, başlıyorum')).toBeVisible({ timeout: 10_000 })

  // Kurucu misafiri çıkarır; misafirin ekranı erişim kaybını gösterir.
  await host.getByRole('button', { name: 'Can Misafir kişisini odadan çıkar' }).click()
  await host.getByRole('dialog').getByRole('button', { name: 'Çıkar' }).click()
  await expect(people).not.toContainText('Can Misafir')
  await expect(guest.getByText('Bu odaya giremiyorsun')).toBeVisible({ timeout: 10_000 })

  await host.getByRole('link', { name: 'Odalar' }).click()
  await expect(host.getByRole('link', { name: /Final haftası/ })).toBeVisible()
  await hostContext.close()
  await guestContext.close()
})
