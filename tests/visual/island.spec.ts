import { expect, test } from '@playwright/test';

test('renderer shows waiting island', async ({ page }) => {
  await page.goto('/?demoState=waiting');

  const island = page.locator('.island');
  await expect(island).toBeVisible();
  await expect(island).toHaveClass(/state-waiting/);
  await expect(page.locator('.summary-text strong')).toHaveText('等待确认');
});

test('renderer shows distinct running and completed states', async ({ page }) => {
  await page.goto('/?demoState=running');
  await expect(page.locator('.island')).toHaveClass(/state-running/);
  await expect(page.locator('.summary-text strong')).toHaveText('运行中');

  await page.goto('/?demoState=completed');
  await expect(page.locator('.island')).toHaveClass(/state-completed/);
  await expect(page.locator('.summary-text strong')).toHaveText('已结束');
});
