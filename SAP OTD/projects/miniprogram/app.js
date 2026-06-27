// app.js - 小程序入口
App({
  onLaunch() {
    console.log('OTD助手启动');
    this.checkNetwork();
    this.checkLogin();
  },

  globalData: {
    // 默认筛选条件（BD9 Sell from Stock）
    salesOrderDefaults: {
      SalesOrderType: 'OR',
      SalesOrganization: '1010',
      DistributionChannel: '10',
      OrganizationDivision: '00'
    },
    // 库存默认范围
    stockDefaults: {
      Plant: '1010',
      StorageLocation: '1003'
    },
    // 认证
    token: null,
    userInfo: null
  },

  // 检查登录态
  checkLogin() {
    const token = wx.getStorageSync('auth_token');
    if (token) {
      this.globalData.token = token;
      console.log('登录态有效');
    } else {
      console.log('未登录，跳转登录页');
      // 延迟跳转，确保小程序初始化完成
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        });
      }, 100);
    }
  },

  // 登录成功保存 token
  setToken(token, userInfo) {
    this.globalData.token = token;
    this.globalData.userInfo = userInfo;
    wx.setStorageSync('auth_token', token);
    if (userInfo) {
      wx.setStorageSync('user_info', userInfo);
    }
  },

  // 清除登录态（token 过期或主动登出）
  clearToken() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    wx.removeStorageSync('auth_token');
    wx.removeStorageSync('user_info');
  },

  // 判断是否已登录
  isLoggedIn() {
    return !!this.globalData.token || !!wx.getStorageSync('auth_token');
  },

  // 全局 401 处理 — 由 api.js 调用
  handleUnauthorized() {
    if (this._handlingUnauthorized) return; // 防止重复跳转
    this._handlingUnauthorized = true;
    this.clearToken();
    wx.showToast({
      title: '登录已过期，请重新登录',
      icon: 'none',
      duration: 2000
    });
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/login/login'
      });
      this._handlingUnauthorized = false;
    }, 2000);
  },

  // 检查网络连接
  checkNetwork() {
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          wx.showToast({
            title: '无网络连接',
            icon: 'none',
            duration: 3000
          });
        }
      }
    });
  }
});
