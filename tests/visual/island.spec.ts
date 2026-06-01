import { expect, test, type Page } from '@playwright/test';

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

test('scaled expanded island stays inside transparent overlay bounds', async ({ page }) => {
  await page.setViewportSize({ width: 493, height: 109 });
  await installOverlaySettings(page, 0.85);
  await page.goto('/?demoState=waiting');

  const island = page.locator('.island');
  await island.hover();
  await expect(island).toHaveClass(/expanded/);

  await expect(island).toHaveCSS('box-shadow', 'none');

  const box = await island.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(493);
  expect(box!.y + box!.height).toBeLessThanOrEqual(109);
});

async function installOverlaySettings(page: Page, sizeScale: number) {
  await page.addInitScript((scale) => {
    (window as Window & { codexLight: NonNullable<Window['codexLight']> }).codexLight = {
      onSnapshot: () => () => undefined,
      setPinnedExpanded: async () => undefined,
      getSettings: async () => ({
        settings: {
          version: 1,
          alignment: 'top-center',
          targetDisplayId: 'primary',
          opacity: 0.96,
          sizeScale: scale,
          startOnLogin: false,
          language: 'zh-CN'
        },
        displays: []
      }),
      updateSettings: async () => ({
        settings: {
          version: 1,
          alignment: 'top-center',
          targetDisplayId: 'primary',
          opacity: 0.96,
          sizeScale: scale,
          startOnLogin: false,
          language: 'zh-CN'
        },
        displays: []
      }),
      onSettingsChanged: () => () => undefined
    };
  }, sizeScale);
}
