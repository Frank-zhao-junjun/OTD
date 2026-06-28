import { join } from 'path';

export { DEFAULT_JWT_SECRET, getJwtSecretKey, isRegistrationAllowed, getRequestBaseUrl } from './auth-config';

export function getWorkspaceEnvLocalPath(): string {
  const workspace = process.env.COZE_WORKSPACE_PATH || process.cwd();
  return join(workspace, '.env.local');
}

/** Runtime overrides from Settings page (writable on Windows/Linux). */
export function getRuntimeEnvLocalPath(): string {
  const workspace = process.env.COZE_WORKSPACE_PATH || process.cwd();
  return join(workspace, '.env.runtime.local');
}

export function getEnvLocalPaths(): string[] {
  return [getRuntimeEnvLocalPath(), getWorkspaceEnvLocalPath()];
}
