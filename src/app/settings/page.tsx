'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Settings, Server, Key, Save, RefreshCw, CheckCircle, AlertCircle, TestTube } from 'lucide-react';

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  options?: string[];
  default: string;
}

export default function SettingsPage() {
  const [schema, setSchema] = useState<ConfigField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSchema(data.schema);
        setValues(data.values);
      }
    } catch {
      setMessage({ type: 'error', text: '加载配置失败' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        // Re-fetch to update masked values
        setTimeout(() => fetchSettings(), 1000);
      } else {
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '保存请求失败' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setMessage(null);
    try {
      // Test with a lightweight API call
      const res = await fetch('/api/sap/API_PRODUCT_SRV/A_Product?top=1&count=true');
      const data = await res.json();
      if (data.success && !data._mock) {
        setMessage({ type: 'success', text: `SAP连接成功！产品数量: ${data.totalCount ?? data.count}` });
      } else if (data._mock) {
        setMessage({ type: 'error', text: '当前为Mock模式，未连接真实SAP系统。请将Mock模式设为false并配置SAP凭证。' });
      } else {
        setMessage({ type: 'error', text: data.error || 'SAP连接失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '连接测试请求失败' });
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
          <span style={{ color: 'var(--muted-foreground)' }} className="text-sm">加载配置...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-6 h-6" style={{ color: 'var(--primary)' }} />
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>系统设置</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
          配置SAP S/4HANA Cloud通信场景的连接参数。保存后需重启服务生效。
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className="mb-4 p-3 rounded-md flex items-start gap-2 text-sm"
          style={{
            background: message.type === 'success' ? 'rgba(16,126,62,0.08)' : 'rgba(187,0,0,0.08)',
            color: message.type === 'success' ? 'var(--status-success)' : 'var(--status-error)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16,126,62,0.2)' : 'rgba(187,0,0,0.2)'}`,
          }}
        >
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        {/* Connection Section */}
        <div className="rounded-lg border mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <Server className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>SAP连接配置</h2>
          </div>
          <div className="p-4 space-y-4">
            {schema.filter(s => s.type !== 'password' && s.key !== 'USE_MOCK').map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={values[field.key] ?? field.default}
                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border text-sm"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  >
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={values[field.key] ?? field.default}
                    onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                    placeholder={field.default}
                    className="w-full h-9 px-3 rounded-md border text-sm"
                    style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Authentication Section */}
        <div className="rounded-lg border mb-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <Key className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>认证凭据</h2>
          </div>
          <div className="p-4 space-y-4">
            {schema.filter(s => s.type === 'password' || s.key === 'sapUsername').map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-medium mb-1.5 uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  value={values[field.key] ?? field.default}
                  onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  placeholder={field.key === 'sapPassword' ? '输入新密码或保持不变' : field.default}
                  className="w-full h-9 px-3 rounded-md border text-sm"
                  style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Mock Mode Section */}
        <div className="rounded-lg border mb-6" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <TestTube className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>开发模式</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Mock模式</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>开启后使用本地模拟数据，不连接SAP系统</div>
              </div>
              <select
                value={values['USE_MOCK'] ?? 'false'}
                onChange={(e) => setValues({ ...values, USE_MOCK: e.target.value })}
                className="h-8 px-3 rounded-md border text-sm"
                style={{ background: 'var(--background)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                <option value="false">关闭 (连接SAP)</option>
                <option value="true">开启 (Mock数据)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="fiori-btn-primary flex items-center gap-2"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? '保存中...' : '保存配置'}
          </button>
          <button
            type="button"
            disabled={testing}
            onClick={handleTestConnection}
            className="fiori-btn-secondary flex items-center gap-2"
          >
            {testing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <TestTube className="w-4 h-4" />
            )}
            {testing ? '测试中...' : '测试连接'}
          </button>
        </div>
      </form>
    </div>
  );
}
