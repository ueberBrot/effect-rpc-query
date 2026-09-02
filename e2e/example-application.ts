import { expect, type Page } from '@playwright/test'

export interface ExampleApplication {
  readonly heading: string
  readonly url: string
}

export const tanStackStartApplication = {
  heading: 'Hydrate generated RPC queries',
  url: 'http://127.0.0.1:3000',
} satisfies ExampleApplication

export const viteReactApplication = {
  heading: 'Generated Effect RPC options in React',
  url: 'http://127.0.0.1:4173',
} satisfies ExampleApplication

/** Establishes deterministic server state through the same controls a user exercises. */
export const prepareExampleApplication = async (
  page: Page,
  application: ExampleApplication,
): Promise<void> => {
  await page.goto(application.url)
  await expect(page.getByRole('heading', { name: application.heading })).toBeVisible()
  await page.getByRole('button', { name: 'Reset users' }).click()
  await expect(page.getByText('Reset result: undefined')).toBeVisible()
  await expect(page.getByText('Ada Lovelace', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Ada Lovelace', { exact: true })).toBeVisible()
}

export const recordsRpc = (postData: string | null, rpcTag: string): boolean =>
  postData?.includes(rpcTag) ?? false
