import { expect, test } from '@playwright/test'

import {
  prepareExampleApplication,
  recordsRpc,
  viteReactApplication,
} from './example-application.ts'

test.describe('plain Vite React application', () => {
  test.beforeEach(async ({ page }) => prepareExampleApplication(page, viteReactApplication))

  test('loads the initial query, reuses its cache, and survives reload', async ({ page }) => {
    await expect(page.getByText('Edsger Dijkstra', { exact: true })).toBeVisible()
    await expect(page.getByText('Featured: Ada Lovelace')).toBeVisible()

    let listRequests = 0
    page.on('request', (request) => {
      if (recordsRpc(request.postData(), 'users.list')) listRequests += 1
    })
    await page.getByRole('button', { name: 'Read cached users' }).click()
    await expect(page.getByText('Cached users: 2')).toBeVisible()
    expect(listRequests).toBe(0)

    await page.reload()
    await expect(page.getByText('Ada Lovelace', { exact: true })).toBeVisible()
  })

  test('loads and accumulates infinite-query pages', async ({ page }) => {
    await expect(page.getByText('Infinite users: Ada Lovelace')).toBeVisible()

    const nextPageResponse = page.waitForResponse(
      (response) => response.ok() && recordsRpc(response.request().postData(), 'users.page'),
    )
    await page.getByRole('button', { name: 'Load next user page' }).click()
    await nextPageResponse

    await expect(page.getByText('Infinite users: Ada Lovelace, Edsger Dijkstra')).toBeVisible()
  })

  test('renders accumulated and live stream values', async ({ page }) => {
    await expect(page.getByText('Accumulated diagnostics: first, second')).toBeVisible()
    await expect(page.getByText('Live diagnostic: second')).toBeVisible()
  })

  test('mutates users and explicitly invalidates through generated keys', async ({ page }) => {
    await page.getByRole('button', { name: 'Seed users' }).click()
    await expect(page.getByText('Grace Hopper', { exact: true })).toBeVisible()
    await expect(page.getByText('Margaret Hamilton', { exact: true })).toBeVisible()

    const listResponse = page.waitForResponse(
      (response) => response.ok() && recordsRpc(response.request().postData(), 'users.list'),
    )
    await page.getByRole('button', { name: 'Invalidate user queries' }).click()
    await listResponse
    await expect(page.getByText('User queries invalidated')).toBeVisible()
  })

  test('renders the complete declared failure', async ({ page }) => {
    await page.getByRole('button', { name: 'Trigger declared failure' }).click()

    const failure = page.getByRole('alert')
    await expect(failure).toContainText('EffectRpcQueryError')
    await expect(failure).toContainText('diagnostics.fail')
    await expect(failure).toContainText('DiagnosticFailure')
  })

  test('cancels a query and observes server interruption', async ({ page }) => {
    await page.getByRole('button', { name: 'Start slow query' }).click()
    await expect(page.getByText('Ready to cancel')).toBeVisible()

    await page.getByRole('button', { name: 'Cancel query' }).click()
    await expect(page.getByText('Server interruptions: 1')).toBeVisible()
  })
})
