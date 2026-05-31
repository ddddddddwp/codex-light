import { expect, test } from '@playwright/test';

test('renderer shows waiting island', async ({ page }) => {
  await page.goto('/?demoState=waiting');

  const island = page.locator('.island');
  await expect(island).toBeVisible();
  await expect(island).toHaveClass(/state-waiting/);
  await expect(page.locator('.status-dot')).toBeVisible();
  await expect(page.locator('.summary-text strong')).toHaveText('codex-light');
  await expect(page.locator('.summary-text strong')).not.toHaveText('等待确认');
});

test('renderer shows distinct running and completed states', async ({ page }) => {
  await page.goto('/?demoState=running');
  await expect(page.locator('.island')).toHaveClass(/state-running/);
  await expect(page.locator('.summary-text strong')).toHaveText('codex-light');

  await page.goto('/?demoState=completed');
  await expect(page.locator('.island')).toHaveClass(/state-completed/);
  await expect(page.locator('.summary-text strong')).toHaveText('codex-light');
});

test('renderer shows expanded session metadata', async ({ page }) => {
  await page.goto('/?demoState=waiting');

  await page.locator('.island').hover();

  await expect(page.locator('.island')).toHaveClass(/expanded/);
  await expect(page.getByText('Waiting for approval: Bash')).toBeVisible();
  await expect(page.getByText('gpt-5.5')).toBeVisible();
  await expect(page.getByText('C:\\code\\codex-light')).toBeVisible();
  await expect(page.getByText('desktop-fallback')).toBeVisible();
  await expect(page.getByText('1 个会话')).toBeVisible();
});
