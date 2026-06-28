'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Lock, Shield } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [allowRegistration, setAllowRegistration] = useState(false);

  const loadCaptcha = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/captcha');
      const data = await res.json();
      if (data.success) {
        setCaptchaSvg(data.svg);
        setCaptchaToken(data.captchaToken);
      }
    } catch (err) {
      console.error('Failed to load captcha:', err);
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
    fetch('/api/auth/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setAllowRegistration(Boolean(data.allowRegistration));
      })
      .catch(() => setAllowRegistration(false));
  }, [loadCaptcha]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captchaCode, captchaToken }),
      });

      const data = await res.json();

      if (data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || '登录失败');
        loadCaptcha();
        setCaptchaCode('');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
      loadCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f5f7fa] to-[#e4e8eb] p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-[#0070F2] rounded-2xl flex items-center justify-center mb-2">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-[#1A2228]">OTD 助手</CardTitle>
          <CardDescription className="text-[#6A6D70]">
            SAP ERP 数据查询系统
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit} method="POST">
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-[#BB0000] bg-[#BB0000]/5">
                <AlertDescription className="text-[#BB0000]">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#1A2228] font-medium">
                用户名
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6D70]" />
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-11 border-[#E4E4E4] focus:border-[#0070F2] focus:ring-[#0070F2]/20"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1A2228] font-medium">
                密码
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6D70]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11 border-[#E4E4E4] focus:border-[#0070F2] focus:ring-[#0070F2]/20"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="captcha" className="text-[#1A2228] font-medium">
                验证码
              </Label>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6D70]" />
                  <Input
                    id="captcha"
                    type="text"
                    placeholder="请输入验证码"
                    value={captchaCode}
                    onChange={(e) => setCaptchaCode(e.target.value)}
                    className="pl-10 h-11 border-[#E4E4E4] focus:border-[#0070F2] focus:ring-[#0070F2]/20"
                    required
                    maxLength={4}
                    autoComplete="off"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadCaptcha}
                  className="h-11 px-2 rounded-md border border-[#E4E4E4] hover:border-[#0070F2] transition-colors overflow-hidden"
                  title="点击刷新验证码"
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button
              type="submit"
              className="w-full h-11 bg-[#0070F2] hover:bg-[#0064d9] text-white font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
            
            {allowRegistration && (
              <p className="text-sm text-[#6A6D70]">
                还没有账号？{' '}
                <Link href="/register" className="text-[#0070F2] hover:underline font-medium">
                  立即注册
                </Link>
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
