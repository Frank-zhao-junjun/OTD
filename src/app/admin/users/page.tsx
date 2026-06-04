'use client';

import { useCallback, useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchSession, type ClientSessionUser } from '@/lib/auth-client';
import { AlertCircle, Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

interface PortalUserRow {
  id: string;
  phone: string;
  displayName: string;
  sapUserId: string | null;
  role: 'user' | 'admin';
  active: boolean;
  hasSapCredentials: boolean;
}

const emptyForm = () => ({
  phone: '',
  displayName: '',
  password: '',
  sapUserId: '',
  sapCommunicationUser: '',
  sapCommunicationPassword: '',
  role: 'user' as 'user' | 'admin',
  active: true,
});

export default function AdminUsersPage() {
  const router = useRouter();
  const [session, setSession] = useState<ClientSessionUser | null>(null);
  const [users, setUsers] = useState<PortalUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/admin/users', { credentials: 'include' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || '加载失败');
    setUsers(json.data ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const s = await fetchSession(true);
        setSession(s);
        if (!s || s.role !== 'admin') {
          router.replace('/');
          return;
        }
        await loadUsers();
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadUsers, router]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (user: PortalUserRow) => {
    setEditingId(user.id);
    setForm({
      phone: user.phone,
      displayName: user.displayName,
      password: '',
      sapUserId: user.sapUserId ?? '',
      sapCommunicationUser: '',
      sapCommunicationPassword: '',
      role: user.role,
      active: user.active,
    });
    setFormOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        phone: form.phone,
        displayName: form.displayName,
        password: form.password || undefined,
        sapUserId: form.sapUserId.trim() || null,
        sapCommunicationUser: form.sapCommunicationUser.trim() || null,
        sapCommunicationPassword: form.sapCommunicationPassword.trim() || null,
        role: form.role,
        active: form.active,
      };
      const url = editingId ? `/api/admin/users/${editingId}` : '/api/admin/users';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || '保存失败');
      setFormOpen(false);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该用户？')) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || '删除失败');
      return;
    }
    await loadUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        加载中...
      </div>
    );
  }

  if (!session || session.role !== 'admin') return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">账号映射管理</h1>
          <p className="text-sm text-slate-500 mt-1">维护手机号、门户账号与 SAP User ID 映射</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          新增用户
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">门户用户列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>手机号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>SAP User ID</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-sm">{u.phone}</TableCell>
                  <TableCell>{u.displayName}</TableCell>
                  <TableCell>
                    {u.sapUserId ? (
                      <span className="font-mono text-sm">{u.sapUserId}</span>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-200">
                        未绑定
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role === 'admin' ? '管理员' : '用户'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.active ? 'outline' : 'destructive'}>
                      {u.active ? '启用' : '停用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {formOpen && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? '编辑用户' : '新增用户'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>姓名</Label>
                <Input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>SAP User ID</Label>
                <Input
                  value={form.sapUserId}
                  onChange={(e) => setForm({ ...form, sapUserId: e.target.value })}
                  placeholder="CB9980000012"
                />
              </div>
              <div className="space-y-2">
                <Label>{editingId ? '新密码（留空不改）' : '初始密码'}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="demo123"
                />
              </div>
              <div className="space-y-2">
                <Label>角色</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as 'user' | 'admin' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">用户</SelectItem>
                    <SelectItem value="admin">管理员</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>状态</Label>
                <Select
                  value={form.active ? 'active' : 'inactive'}
                  onValueChange={(v) => setForm({ ...form, active: v === 'active' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">启用</SelectItem>
                    <SelectItem value="inactive">停用</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>SAP 通信用户（可选，完整 per-user 授权）</Label>
                <Input
                  value={form.sapCommunicationUser}
                  onChange={(e) => setForm({ ...form, sapCommunicationUser: e.target.value })}
                  placeholder="留空则使用环境变量 SAP_USERNAME"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>SAP 通信密码（可选）</Label>
                <Input
                  type="password"
                  value={form.sapCommunicationPassword}
                  onChange={(e) => setForm({ ...form, sapCommunicationPassword: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
