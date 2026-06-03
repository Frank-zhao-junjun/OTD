// app.js - 小程序入口
App({
  onLaunch() {
    console.log('ES+OTD助手启动');
    this.checkNetwork();
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
    }
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
