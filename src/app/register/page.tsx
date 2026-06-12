'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Lock, Mail, UserCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    displayName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度至少6个字符');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email || undefined,
          displayName: formData.displayName || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess('注册成功！正在跳转到登录页面...');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        setError(data.error || '注册失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
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
          <CardTitle className="text-2xl font-bold text-[#1A2228]">注册账号</CardTitle>
          <CardDescription className="text-[#6A6D70]">
            创建您的 OTD 助手账号
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="border-[#BB0000] bg-[#BB0000]/5">
                <AlertDescription className="text-[#BB0000]">{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-[#107E3E] bg-[#107E3E]/5">
                <AlertDescription className="text-[#107E3E]">{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-[#1A2228] font-medium">
                用户名 <span className="text-[#BB0000]">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6D70]" />
                <Input
                  id="username"
                  type="text"
                  placeholder="3-20个字符，字母数字下划线"
                  value={formData.username}
                  onChange={handleChange('username')}
                  className="pl-10 h-11 border-[#E4E4E4] focus:border-[#0070F2] focus:ring-[#0070F2]/20"
                  required
                  minLength={3}
                  maxLength={20}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-[#1A2228] font-medium">
                显示名称
              </Label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6D70]" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="您的显示名称（可选）"
                  value={formData.displayName}
                  onChange={handleChange('displayName')}
                  className="pl-10 h-11 border-[#E4E4E4] focus:border-[#0070F2] focus:ring-[#0070F2]/20"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#1A2228] font-medium">
                邮箱
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6D70]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com（可选）"
                  value={formData.email}
                  onChange={handleChange('email')}
                  className="pl-10 h-11 border-[#E4E4E4] focus:border-[#0070F2] focus:ring-[#0070F2]/20"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#1A2228] font-medium">
                密码 <span className="text-[#BB0000]">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6D70]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="至少6个字符"
                  value={formData.password}
                  onChange={handleChange('password')}
                  className="pl-10 h-11 border-[#E4E4E4] focus:border-[#0070F2] focus:ring-[#0070F2]/20"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#1A2228] font-medium">
                确认密码 <span className="text-[#BB0000]">*</span>
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6A6D70]" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="再次输入密码"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  className="pl-10 h-11 border-[#E4E4E4] focus:border-[#0070F2] focus:ring-[#0070F2]/20"
                  required
                  minLength={6}
                  autoComplete="new-password"
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
                  注册中...
                </>
              ) : (
                '注册'
              )}
            </Button>
            
            <p className="text-sm text-[#6A6D70]">
              已有账号？{' '}
              <Link href="/login" className="text-[#0070F2] hover:underline font-medium">
                立即登录
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
