// utils/view-mode.js - 视图模式偏好读写
const KEY = 'viewMode';

function getViewMode(pageKey) {
  try {
    const all = wx.getStorageSync('viewModes') || {};
    return all[pageKey] || 'card';
  } catch (e) {
    return 'card';
  }
}

function setViewMode(pageKey, mode) {
  try {
    const all = wx.getStorageSync('viewModes') || {};
    all[pageKey] = mode;
    wx.setStorageSync('viewModes', all);
  } catch (e) {
    // ignore
  }
}

module.exports = { getViewMode, setViewMode };
