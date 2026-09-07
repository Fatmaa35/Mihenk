import { expect, test } from '@playwright/test'

test('invitation sets a password and returns to login without exposing tokens in URL', async ({ page }) => {
  let submitted: Record<string, string> | undefined
  await page.route('**/auth/password/reset', async route => {
    submitted = route.request().postDataJSON()
    await route.fulfill({ json: { message: 'Parolan güncellendi.' } })
  })
  await page.goto('/#type=invite&access_token=test-invitation-token&refresh_token=private-refresh')
  await expect(page.getByRole('heading', { name: 'Mihenk’e hoş geldin' })).toBeVisible()
  await expect(page).not.toHaveURL(/access_token|refresh_token/)
  await page.locator('#new-password').fill('safe-password')
  await page.locator('#new-password-confirm').fill('different-password')
  await page.getByRole('button', { name: 'Parola oluştur', exact: true }).click()
  await expect(page.locator('#password-reset-status')).toContainText('eşleşmiyor')
  expect(submitted).toBeUndefined()
  await page.locator('#new-password-confirm').fill('safe-password')
  await page.getByRole('button', { name: 'Parola oluştur', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldin' })).toBeVisible()
  await expect(page.locator('#auth-error')).toContainText('Parolan oluşturuldu')
  expect(submitted).toEqual({ recovery_token: 'test-invitation-token', new_password: 'safe-password' })
})

test('expired invitation gives an actionable error', async ({ page }) => {
  await page.goto('/#error=access_denied&error_code=otp_expired')
  await expect(page.locator('#recovery-status')).toContainText('yöneticiden yeni bağlantı')
  await expect(page.locator('#password-reset-dialog')).not.toBeVisible()
})

test('public signup remains available alongside invitations', async ({ page }) => {
  await page.route('**/auth/register', route => route.fulfill({ status: 201, json: { email_confirmation_required: true } }))
  await page.goto('/')
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).first().click()
  await page.locator('#auth-switch').click()
  await page.locator('#auth-name').fill('New Reader')
  await page.locator('#auth-email').fill('reader@example.com')
  await page.locator('#auth-password').fill('safe-password')
  await page.locator('#auth-submit').click()
  await expect(page.locator('#auth-error')).toContainText('hesabını doğrula')
})

test('admin invitation form reports delivery and preserves input on failure', async ({ page }) => {
  let requests = 0
  await page.route('**/admin/invitations', async route => {
    requests++
    expect(route.request().postDataJSON()).toEqual({ display_name: 'Invited Reader', email: 'invitee@example.com' })
    await route.fulfill(requests === 1
      ? { status: 429, json: { detail: 'İstek sınırına ulaşıldı.' } }
      : { status: 201, json: { message: 'Davet e-postası gönderildi.' } })
  })
  await page.goto('/')
  // Isolate the form UI; server-side role enforcement is covered by API tests.
  await page.waitForFunction(() => !!document.querySelector<HTMLFormElement>('#admin-invitation-form')?.onsubmit)
  await page.evaluate(() => {
    const panel = document.querySelector('#admin-invitation-panel')!
    document.body.append(panel)
    panel.classList.remove('hidden')
  })
  await page.locator('#admin-invitation-name').fill('Invited Reader')
  await page.locator('#admin-invitation-email').fill('invitee@example.com')
  await page.locator('#admin-invitation-submit').click()
  await expect(page.locator('#admin-invitation-status')).toContainText('İstek sınırına')
  await expect(page.locator('#admin-invitation-email')).toHaveValue('invitee@example.com')
  await page.locator('#admin-invitation-submit').click()
  await expect(page.locator('#admin-invitation-status')).toContainText('gönderildi')
  await expect(page.locator('#admin-invitation-email')).toHaveValue('')
})
