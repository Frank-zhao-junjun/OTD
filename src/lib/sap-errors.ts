/** SAP / OData HTTP error → user-facing message (Chinese) */
export const SAP_NO_PERMISSION_MESSAGE = '当前账号无此数据权限';

export function mapSapHttpError(status: number, details?: string): { message: string; code?: string } {
  if (status === 403) {
    return { message: SAP_NO_PERMISSION_MESSAGE, code: 'SAP_FORBIDDEN' };
  }
  if (status === 401) {
    return { message: 'SAP 认证失败，请检查账号配置', code: 'SAP_UNAUTHORIZED' };
  }
  if (status === 404) {
    return { message: '请求的数据或服务不存在', code: 'SAP_NOT_FOUND' };
  }
  const hint = details?.trim().slice(0, 200);
  return {
    message: hint ? `SAP 查询失败（${status}）：${hint}` : `SAP 查询失败（${status}）`,
    code: 'SAP_ERROR',
  };
}

export function parseClientSapError(payload: {
  success?: boolean;
  error?: string;
  code?: string;
  message?: string;
}): string {
  if (payload.code === 'SAP_FORBIDDEN' || payload.error === SAP_NO_PERMISSION_MESSAGE) {
    return SAP_NO_PERMISSION_MESSAGE;
  }
  if (payload.code === 'SAP_USER_UNBOUND') {
    return payload.error || '当前账号未绑定 SAP User ID，无法访问业务数据';
  }
  if (payload.code === 'AUTH_REQUIRED') {
    return payload.error || '请先登录';
  }
  return payload.error || payload.message || '查询失败';
}
