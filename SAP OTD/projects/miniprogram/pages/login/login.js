// pages/login/login.js
const { api } = require('../../utils/api');

Page({
  data: {
    username: '',
    password: '',
    captcha: '',
    captchaId: '',
    captchaSvgBase64: '',
    showPassword: false,
    submitting: false,
    errors: {
      username: '',
      password: '',
      captcha: ''
    }
  },

  onLoad() {
    this.fetchCaptcha();
  },

  // 获取验证码
  async fetchCaptcha() {
    try {
      const res = await api.getCaptcha();
      if (res.success && res.data && res.data.svg) {
        const base64 = wx.arrayBufferToBase64(
          new Uint8Array(
            unescape(encodeURIComponent(res.data.svg)).split('').map(c => c.charCodeAt(0))
          ).buffer
        );
        this.setData({
          captchaId: res.data.captchaId || '',
          captchaSvgBase64: 'data:image/svg+xml;base64,' + base64
        });
      }
    } catch (err) {
      console.error('获取验证码失败:', err);
    }
  },

  // 刷新验证码
  onRefreshCaptcha() {
    this.setData({ captcha: '' });
    this.fetchCaptcha();
  },

  // 切换密码可见性
  onTogglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  // ── 字段校验 ──────────────────────────────────────────

  validateUsername(value) {
    if (!value) return '请输入用户名';
    if (value.length < 3 || value.length > 20) return '用户名需 3-20 个字符';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return '用户名只能包含字母、数字、下划线';
    return '';
  },

  validatePassword(value) {
    if (!value) return '请输入密码';
    if (value.length < 6 || value.length > 32) return '密码需 6-32 个字符';
    return '';
  },

  validateCaptcha(value) {
    if (!value) return '请输入验证码';
    if (!/^\d{4}$/.test(value)) return '验证码为 4 位数字';
    return '';
  },

  // ── 输入绑定 ──────────────────────────────────────────

  onUsernameInput(e) {
    const value = e.detail.value;
    this.setData({
      username: value,
      'errors.username': this.validateUsername(value)
    });
  },

  onPasswordInput(e) {
    const value = e.detail.value;
    this.setData({
      password: value,
      'errors.password': this.validatePassword(value)
    });
  },

  onCaptchaInput(e) {
    const value = e.detail.value;
    this.setData({
      captcha: value,
      'errors.captcha': this.validateCaptcha(value)
    });
  },

  // ── 登录 ──────────────────────────────────────────────

  async onLogin() {
    const { username, password, captcha, captchaId } = this.data;

    // 全字段校验
    const errors = {
      username: this.validateUsername(username),
      password: this.validatePassword(password),
      captcha: this.validateCaptcha(captcha)
    };
    this.setData({ errors });

    if (errors.username || errors.password || errors.captcha) return;

    this.setData({ submitting: true });

    try {
      const res = await api.login(username, password, captcha, captchaId);
      if (res.success && res.data?.token) {
        const app = getApp();
        app.setToken(res.data.token, res.data.user);

        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 1500);
      } else {
        wx.showToast({
          title: '登录失败，请重试',
          icon: 'none'
        });
      }
    } catch (err) {
      // 登录失败：模糊提示 + 刷新验证码
      wx.showToast({
        title: '用户名或密码错误',
        icon: 'none',
        duration: 2000
      });
      this.fetchCaptcha();
      this.setData({ captcha: '' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ── 跳转注册 ──────────────────────────────────────────

  onGoRegister() {
    wx.navigateTo({ url: '/pages/register/register' });
  }
});
