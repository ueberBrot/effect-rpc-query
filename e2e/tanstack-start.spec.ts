import { expect, test } from '@playwright/test'

import {
  prepareExampleApplication,
  recordsRpc,
  tanStackStartApplication,
} from './example-application.ts'

test.describe('TanStack Start application', () => {
  test.beforeEach(async ({ page }) => prepareExampleApplication(page, tanStackStartApplication))

  test('server-renders and hydrates without a duplicate successful query', async ({ page }) => {
    let browserListRequests = 0
    page.on('request', (request) => {
      if (recordsRpc(request.postData(), 'users.list')) browserListRequests += 1
    })

    const response = await page.reload()

    expect(response?.ok()).toBe(true)
    await expect(page.getByText('Ada Lovelace', { exact: true })).toBeVisible()
    await expect(page.getByText('Edsger Dijkstra', { exact: true })).toBeVisible()
    expect(browserListRequests).toBe(0)
  })

  test('navigates on the client and reuses the hydrated cache', async ({ page }) => {
    await page.getByRole('link', { name: 'Featured user' }).click()
    await expect(page.getByRole('heading', { name: 'Featured user' })).toBeVisible()
    await expect(page.getByText('Ada Lovelace', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: 'Users' }).click()
    await expect(page.getByRole('heading', { name: 'Hydrate generated RPC queries' })).toBeVisible()
    let browserListRequests = 0
    page.on('request', (request) => {
      if (recordsRpc(request.postData(), 'users.list')) browserListRequests += 1
    })
    await page.getByRole('button', { name: 'Read cached users' }).click()
    await expect(page.getByText('Cached users: 2')).toBeVisible()
    expect(browserListRequests).toBe(0)
  })

  test('mutates and invalidates the hydrated users query', async ({ page }) => {
    await page.getByRole('button', { name: 'Seed users' }).click()

    await expect(page.getByText('Grace Hopper', { exact: true })).toBeVisible()
    await expect(page.getByText('Margaret Hamilton', { exact: true })).toBeVisible()
  })

  test('shows declared failures and externally visible cancellation', async ({ page }) => {
    await page.getByRole('link', { name: 'Diagnostics' }).click()
    await expect(page.getByRole('heading', { name: 'Failures and cancellation' })).toBeVisible()

    await page.getByRole('button', { name: 'Trigger declared failure' }).click()
    const failure = page.getByRole('alert')
    await expect(failure).toContainText('EffectRpcQueryError')
    await expect(failure).toContainText('DiagnosticFailure')

    await page.getByRole('button', { name: 'Start slow query' }).click()
    await expect(page.getByText('Ready to cancel')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel query' }).click()
    await expect(page.getByText('Server interruptions: 1')).toBeVisible()
  })
})
