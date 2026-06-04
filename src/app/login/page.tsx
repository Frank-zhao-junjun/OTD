'use client';

import { useState, FormEvent, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { clearSessionCache, fetchSession } from '@/lib/auth-client';
import { AlertCircle, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<'password' | 'otp'>('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSession(true).then((s) => {
      if (s) router.replace(from);
    });
  }, [from, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phone,
          password: mode === 'password' ? password : undefined,
          otp: mode === 'otp' ? otp : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || '登录失败');
      }
      clearSessionCache();
      router.replace(from);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            ES
          </div>
          <CardTitle className="text-xl">ES+OTD助手</CardTitle>
          <CardDescription>手机号登录 PC 门户</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">手机号</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="13800000001"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>

            <div className="flex gap-2 text-sm">
              <button
                type="button"
                className={`px-3 py-1 rounded-md cursor-pointer ${mode === 'password' ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}
                onClick={() => setMode('password')}
              >
                密码登录
              </button>
              <button
                type="button"
                className={`px-3 py-1 rounded-md cursor-pointer ${mode === 'otp' ? 'bg-blue-100 text-blue-700' : 'text-slate-500'}`}
                onClick={() => setMode('otp')}
              >
                验证码（Demo）
              </button>
            </div>

            {mode === 'password' ? (
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="demo123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="otp">验证码</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-400">Demo 环境固定验证码：123456</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '登录'}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400 space-y-1">
            <p>Demo 账号：</p>
            <p>管理员 13800000001 / demo123</p>
            <p>销售 13800000002 / demo123</p>
            <p>未绑定SAP 13800000003 / demo123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
