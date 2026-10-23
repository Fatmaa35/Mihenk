import { expect, test } from '@playwright/test'

test('anonymous visitors land on the sign-in page after a session check', async ({ page }) => {
  let bootstrapRequested = false
  await page.route('**/me/bootstrap', async (route) => {
    bootstrapRequested = true
    await route.fulfill({ status: 401, json: { detail: 'Oturum açmanız gerekiyor.' } })
  })
  await page.goto('/kitapligim')
  await expect(page).toHaveURL(/\/giris$/)
  await expect(page.getByRole('heading', { name: 'Bir sonraki kitabın seni bekliyor.' })).toBeVisible()
  expect(bootstrapRequested).toBe(true)
})

test('sign-in form is accessible and offers password recovery', async ({ page }) => {
  await page.goto('/giris')
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldin' })).toBeVisible()
  await expect(page.getByLabel('E-posta')).toHaveAttribute('autocomplete', 'email')
  await expect(page.locator('input[name=password]')).toHaveAttribute('autocomplete', 'current-password')
  await page.getByRole('button', { name: 'Parolayı göster' }).click()
  await expect(page.locator('input[name=password]')).toHaveAttribute('type', 'text')
  await page.getByRole('button', { name: 'Parolamı unuttum' }).click()
  await expect(page.getByRole('heading', { name: 'Parolanı sıfırla' })).toBeVisible()
})

test('invalid login shows a generic error and keeps the form usable', async ({ page }) => {
  await page.goto('/giris')
  await page.getByLabel('E-posta').fill('nobody@example.com')
  await page.locator('input[name=password]').fill('yanlis-parola')
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).last().click()
  await expect(page.getByRole('alert')).toContainText('E-posta veya parola hatalı')
  await expect(page.getByRole('button', { name: 'Giriş yap', exact: true }).last()).toBeEnabled()
})

test('signup that needs email confirmation explains the next step', async ({ page }) => {
  await page.route('**/auth/register', (route) => route.fulfill({ status: 201, json: { id: 'x', display_name: 'Yeni', email_confirmation_required: true } }))
  await page.goto('/giris')
  await page.getByRole('tab', { name: 'Kayıt ol' }).click()
  await page.getByLabel('Adın').fill('Yeni Okur')
  await page.getByLabel('E-posta').fill('reader@example.com')
  await page.locator('input[name=password]').fill('safe-password')
  await page.getByRole('button', { name: 'Hesap oluştur' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'hesabını doğrula' })).toBeVisible()
})

test('expired email links offer a fresh recovery link without echoing URL content', async ({ page }) => {
  await page.goto('/#error=access_denied&error_code=otp_expired&error_description=untrusted-marker')
  await expect(page).toHaveURL(/\/giris$/)
  await expect(page.getByRole('heading', { name: 'Parolanı sıfırla' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('yöneticiden yeni bağlantı')
  await expect(page.locator('body')).not.toContainText('untrusted-marker')
})

test('invitation link sets a password without keeping tokens in the address bar', async ({ page }) => {
  let submitted: Record<string, string> | undefined
  await page.route('**/auth/password/reset', async (route) => {
    submitted = route.request().postDataJSON()
    await route.fulfill({ json: { message: 'Parolan güncellendi.' } })
  })
  await page.goto('/#type=invite&access_token=test-invitation-token&refresh_token=private-refresh')
  await expect(page.getByRole('heading', { name: 'Mihenk’e hoş geldin' })).toBeVisible()
  await expect(page).not.toHaveURL(/access_token|refresh_token/)
  await page.getByLabel('Yeni parola').fill('safe-password')
  await page.getByLabel('Parola (tekrar)').fill('different-password')
  await page.getByRole('button', { name: 'Parola oluştur' }).click()
  await expect(page.getByRole('alert')).toContainText('eşleşmiyor')
  expect(submitted).toBeUndefined()
  await page.getByLabel('Parola (tekrar)').fill('safe-password')
  await page.getByRole('button', { name: 'Parola oluştur' }).click()
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldin' })).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Parolan oluşturuldu' })).toBeVisible()
  expect(submitted).toEqual({ recovery_token: 'test-invitation-token', new_password: 'safe-password' })
})

test('old classic links redirect to the matching new screen', async ({ page }) => {
  await page.goto('/classic?view=alerts')
  await expect(page).toHaveURL(/\/(bildirimler\?sekme=alarmlar|giris)$/)
})
