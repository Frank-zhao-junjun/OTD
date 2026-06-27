// pages/register/register.js
const { api } = require('../../utils/api');

Page({
  data: {
    username: '',
    password: '',
    confirmPassword: '',
    captcha: '',
    captchaId: '',
    captchaSvgBase64: '',
    showPassword: false,
    showConfirmPassword: false,
    submitting: false,
    errors: {
      username: '',
      password: '',
      confirmPassword: '',
      captcha: ''
    }
  },

  onLoad() {
    this.fetchCaptcha();
  },

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

  onRefreshCaptcha() {
    this.setData({ captcha: '' });
    this.fetchCaptcha();
  },

  onTogglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  onToggleConfirmPassword() {
    this.setData({ showConfirmPassword: !this.data.showConfirmPassword });
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

  validateConfirmPassword(value, password) {
    if (!value) return '请确认密码';
    if (value !== password) return '两次密码输入不一致';
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
      'errors.password': this.validatePassword(value),
      // 同步校验确认密码
      'errors.confirmPassword': this.data.confirmPassword
        ? this.validateConfirmPassword(this.data.confirmPassword, value)
        : ''
    });
  },

  onConfirmPasswordInput(e) {
    const value = e.detail.value;
    this.setData({
      confirmPassword: value,
      'errors.confirmPassword': this.validateConfirmPassword(value, this.data.password)
    });
  },

  onCaptchaInput(e) {
    const value = e.detail.value;
    this.setData({
      captcha: value,
      'errors.captcha': this.validateCaptcha(value)
    });
  },

  // ── 注册 ──────────────────────────────────────────────

  async onRegister() {
    const { username, password, confirmPassword, captcha, captchaId } = this.data;

    const errors = {
      username: this.validateUsername(username),
      password: this.validatePassword(password),
      confirmPassword: this.validateConfirmPassword(confirmPassword, password),
      captcha: this.validateCaptcha(captcha)
    };
    this.setData({ errors });

    if (errors.username || errors.password || errors.confirmPassword || errors.captcha) return;

    this.setData({ submitting: true });

    try {
      const res = await api.register(username, password, confirmPassword, captcha, captchaId);

      // 注册成功后自动登录
      if (res.success && res.data?.token) {
        const app = getApp();
        app.setToken(res.data.token, res.data.user);

        wx.showToast({
          title: '注册成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 1500);
      } else {
        wx.showToast({
          title: '注册失败，请重试',
          icon: 'none'
        });
      }
    } catch (err) {
      wx.showToast({
        title: typeof err === 'string' ? err : '注册失败，请重试',
        icon: 'none',
        duration: 2000
      });
      this.fetchCaptcha();
      this.setData({ captcha: '' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  // ── 返回登录 ──────────────────────────────────────────

  onGoLogin() {
    wx.navigateBack();
  }
});
