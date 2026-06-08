import { test } from '@playwright/test';

export const SAP_SANDBOX_URL =
  process.env.SAP_BASE_URL ?? 'https://my200967-api.s4hana.sapcloud.cn';

export function hasSapCredentials(): boolean {
  return Boolean(process.env.SAP_USERNAME?.trim() && process.env.SAP_PASSWORD?.trim());
}

export function e2ePortalPhone(): string {
  return process.env.E2E_PHONE ?? '13800000002';
}

export function e2ePortalPassword(): string {
  return process.env.E2E_PASSWORD ?? 'demo123';
}

/** Known sandbox orders in org 1010 / channel 10 / division 00 / type OR (e.g. 1–13). */
export function e2eSandboxSalesOrder(): string {
  return process.env.E2E_SALES_ORDER?.trim() || '1';
}

export const E2E_SANDBOX_SALES_ORDERS = [
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
] as const;

/** Skip when SAP sandbox credentials are not configured (see .env.e2e.example). */
export function describeSapSandbox(title: string, fn: () => void): void {
  test.describe(title, () => {
    test.beforeEach(({ }, testInfo) => {
      if (!hasSapCredentials()) {
        testInfo.skip(
          true,
          'Set SAP_USERNAME and SAP_PASSWORD in .env.local or .env.e2e.local',
        );
      }
    });
    fn();
  });
}
