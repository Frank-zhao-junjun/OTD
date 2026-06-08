import { expect, type Page } from '@playwright/test';

const SAP_FAILURE_PATTERNS = [
  '查询失败',
  'SAP 认证失败',
  '未绑定 SAP',
  '当前账号无此数据权限',
  'SAP credentials not configured',
];

/** Wait for sales-order list query against real SAP to settle. */
export async function waitForSalesOrderListReady(
  page: Page,
  options?: { clickSearch?: boolean },
): Promise<void> {
  const clickSearch = options?.clickSearch ?? true;
  const searchBtn = page.getByRole('button', { name: '查询' });
  await expect(searchBtn).toBeEnabled({ timeout: 15_000 });
  if (clickSearch) {
    await searchBtn.click();
  }

  await expect(searchBtn).toBeEnabled({ timeout: 90_000 });

  for (const text of SAP_FAILURE_PATTERNS) {
    await expect(page.getByText(text, { exact: false })).toHaveCount(0);
  }

  const row = page.locator('table tbody tr').first();
  const empty = page.getByText('暂无数据');
  await expect(row.or(empty)).toBeVisible({ timeout: 5_000 });
}

export async function runSalesOrderSearch(page: Page): Promise<void> {
  await waitForSalesOrderListReady(page, { clickSearch: true });
}

export async function searchSalesOrderByNo(page: Page, salesOrderNo: string): Promise<void> {
  await page.getByRole('button', { name: '清除' }).click();
  const input = page.getByPlaceholder('订单号');
  await input.fill(salesOrderNo);
  await waitForSalesOrderListReady(page, { clickSearch: true });
}

export async function openSalesOrderRow(page: Page, salesOrderNo: string): Promise<void> {
  const cell = page.getByRole('cell', { name: salesOrderNo, exact: true });
  await expect(cell).toBeVisible({ timeout: 30_000 });
  await cell.click();
}

/** Wait for delivery / posting / billing chain load after row select. */
export async function waitForOrderDetailChain(page: Page): Promise<void> {
  await expect(page.getByText(/加载发货.*过账.*开票/)).toBeHidden({ timeout: 90_000 });
  await expect(page.getByRole('tab', { name: /^发货 \(\d+\)/ })).toBeVisible({ timeout: 15_000 });
}
