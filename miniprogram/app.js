// app.js - 小程序入口
App({
  onLaunch() {
    // 初始化全局数据
    this.globalData = {
      userInfo: null,
      apiBaseUrl: 'https://your-domain.coze.site/api/sap'
    };
    
    // 检查登录状态
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
  },
  
  // 全局方法：检查网络状态
  checkNetwork() {
    wx.getNetworkType({
      success: (res) => {
        if (res.networkType === 'none') {
          wx.showToast({
            title: '网络不可用',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  }
});