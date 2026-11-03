import { expect, test } from '@playwright/test'

// These smoke tests deliberately never collect candidate personal data.
// The public ATS stays closed until a company opts in and server security keys exist.
test('unknown employer exposes no candidate form and supports Arabic/English', async ({
  page
}) => {
  await page.goto('/careers/hireflow-unknown-tenant-e2e')

  await expect(
    page.getByRole('heading', { name: 'فرصتك الجديدة تبدأ هنا' })
  ).toBeVisible()
  await expect(page.locator('main')).toHaveAttribute('dir', 'rtl')
  await expect(
    page.getByRole('heading', { name: 'لا توجد وظائف متاحة حاليًا' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'قدّم الآن' })).toHaveCount(0)
  await expect(page.locator('form')).toHaveCount(0)

  await page.getByRole('button', { name: 'English' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your next opportunity starts here' })
  ).toBeVisible()
  await expect(page.locator('main')).toHaveAttribute('dir', 'ltr')
  await expect(
    page.getByRole('heading', { name: 'No open positions right now' })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Apply now' })).toHaveCount(0)
})

test('recruitment dashboard does not expose private records without login', async ({
  page
}) => {
  await page.goto('/workspaces/starter-lab/recruitment')
  await page.waitForURL(/\/sign-in/)
  const redirect = new URL(page.url()).searchParams.get('redirect')
  expect(redirect).toContain('/workspaces/starter-lab/recruitment')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})
