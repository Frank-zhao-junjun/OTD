'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck, Users, UserPlus, Trash2, KeyRound, ToggleLeft, ToggleRight } from 'lucide-react';

interface UserItem {
  id: string;
  username: string;
  role: 'admin' | 'user';
  email?: string;
  displayName?: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [registrationAllowed, setRegistrationAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [resetModal, setResetModal] = useState<{ userId: string; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersRes, regRes] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/registration'),
      ]);
      const usersData = await usersRes.json();
      const regData = await regRes.json();

      if (usersData.success) setUsers(usersData.users);
      if (regData.success) setRegistrationAllowed(regData.allowed);
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleRegistration() {
    setActionLoading('registration');
    try {
      const res = await fetch('/api/admin/registration', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowed: !registrationAllowed }),
      });
      const data = await res.json();
      if (data.success) {
        setRegistrationAllowed(!registrationAllowed);
        showMessage('success', data.message);
      } else {
        showMessage('error', data.error);
      }
    } catch {
      showMessage('error', '操作失败');
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteUser(userId: string, username: string) {
    if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可撤销。`)) return;

    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        showMessage('success', `用户 ${username} 已删除`);
      } else {
        showMessage('error', data.error);
      }
    } catch {
      showMessage('error', '删除失败');
    } finally {
      setActionLoading(null);
    }
  }

  async function toggleRole(userId: string, currentRole: 'admin' | 'user') {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setActionLoading(`role-${userId}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        showMessage('success', `${data.user.username} 角色已更新为 ${newRole === 'admin' ? '管理员' : '普通用户'}`);
      } else {
        showMessage('error', data.error);
      }
    } catch {
      showMessage('error', '更新角色失败');
    } finally {
      setActionLoading(null);
    }
  }

  async function resetPassword() {
    if (!resetModal || !newPassword) return;
    setActionLoading(`reset-${resetModal.userId}`);
    try {
      const res = await fetch(`/api/admin/users/${resetModal.userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', `${resetModal.username} 密码已重置`);
        setResetModal(null);
        setNewPassword('');
      } else {
        showMessage('error', data.error);
      }
    } catch {
      showMessage('error', '重置密码失败');
    } finally {
      setActionLoading(null);
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>用户管理</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>管理系统用户和注册设置</p>
        </div>
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          <Users className="w-4 h-4" />
          <span>{users.length} 个用户</span>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div
          className="fixed top-16 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all"
          style={{
            background: message.type === 'success' ? '#107E3E' : '#BB0000',
            color: '#FFF',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Registration Toggle */}
      <div className="rounded-lg border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {registrationAllowed ? (
              <ToggleRight className="w-6 h-6" style={{ color: '#107E3E' }} />
            ) : (
              <ToggleLeft className="w-6 h-6" style={{ color: 'var(--muted-foreground)' }} />
            )}
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>开放注册</p>
              <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {registrationAllowed ? '新用户可以自行注册账号' : '注册已关闭，需管理员创建账号'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleRegistration}
            disabled={actionLoading === 'registration'}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              background: registrationAllowed ? 'var(--muted)' : 'var(--primary)',
              color: registrationAllowed ? 'var(--muted-foreground)' : '#FFF',
            }}
          >
            {actionLoading === 'registration' ? '...' : registrationAllowed ? '关闭注册' : '开放注册'}
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-lg border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>用户名</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>显示名</th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>角色</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell" style={{ color: 'var(--muted-foreground)' }}>邮箱</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell" style={{ color: 'var(--muted-foreground)' }}>创建时间</th>
                <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--muted-foreground)' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-b-0 hover:bg-[var(--accent)]/50 transition-colors" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--foreground)' }}>{user.username}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--foreground)' }}>{user.displayName || '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleRole(user.id, user.role)}
                      disabled={actionLoading === `role-${user.id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium cursor-pointer transition-colors disabled:cursor-not-allowed"
                      style={{
                        background: user.role === 'admin' ? 'rgba(0,112,242,0.12)' : 'rgba(106,109,112,0.12)',
                        color: user.role === 'admin' ? '#0070F2' : '#6A6D70',
                      }}
                      title={user.role === 'admin' ? '点击降为普通用户' : '点击升为管理员'}
                    >
                      <ShieldCheck className="w-3 h-3" />
                      {user.role === 'admin' ? '管理员' : '用户'}
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--muted-foreground)' }}>{user.email || '-'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell" style={{ color: 'var(--muted-foreground)' }}>
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setResetModal({ userId: user.id, username: user.username })}
                        disabled={actionLoading === `reset-${user.id}`}
                        className="p-1.5 rounded-md hover:bg-[var(--accent)] transition-colors"
                        style={{ color: 'var(--muted-foreground)' }}
                        title="重置密码"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.username)}
                        disabled={actionLoading === user.id}
                        className="p-1.5 rounded-md hover:bg-[rgba(187,0,0,0.1)] transition-colors"
                        style={{ color: '#BB0000' }}
                        title="删除用户"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm mx-4 rounded-lg shadow-xl p-6" style={{ background: 'var(--card)' }}>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>重置密码</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
              为用户 <strong>{resetModal.username}</strong> 设置新密码
            </p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="输入新密码（至少6位）"
              className="w-full px-3 py-2 rounded-md border text-sm mb-4 outline-none focus:ring-2"
              style={{
                background: 'var(--background)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)',
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') resetPassword(); }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setResetModal(null); setNewPassword(''); }}
                className="px-4 py-1.5 rounded-md text-sm"
                style={{ color: 'var(--muted-foreground)' }}
              >
                取消
              </button>
              <button
                onClick={resetPassword}
                disabled={newPassword.length < 6}
                className="px-4 py-1.5 rounded-md text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
