# 微信小程序部署指南

## 前置条件

1. **微信小程序账号** — 已在 [微信公众平台](https://mp.weixin.qq.com/) 注册
2. **AppID** — 在公众平台「开发管理」→「开发设置」中获取
3. **服务器域名** — Web 端已部署并可公网访问（HTTPS）
4. **微信开发者工具** — 下载安装 [稳定版](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

---

## 步骤 1：配置生产环境 API 域名

编辑 `miniprogram/app-config.js`，将 `apiHost` 改为你的生产域名：

```js
module.exports = {
  // 生产环境域名（必须 HTTPS）
  apiHost: 'https://your-domain.coze.site',
  appName: 'OTD助手',
}
```

> ⚠️ 沙箱域名 `*.dev.coze.site` 仅供开发使用，无法用于小程序正式发布。

---

## 步骤 2：微信公众平台配置服务器域名

登录 [微信公众平台](https://mp.weixin.qq.com/) → 开发管理 → 开发设置 → 服务器域名：

| 类型 | 需要添加的域名 |
|------|--------------|
| request合法域名 | `https://your-domain.coze.site` |
| uploadFile合法域名 | （如需上传文件）同上 |
| downloadFile合法域名 | （如需下载文件）同上 |

> 域名必须备案，且支持 HTTPS。不支持 IP 地址和 localhost。

---

## 步骤 3：微信开发者工具导入项目

1. 打开「微信开发者工具」
2. 点击「导入项目」
3. 项目目录：选择 `/workspace/projects/miniprogram`（或你本地克隆的 `miniprogram` 文件夹）
4. AppID：填写你的小程序 AppID
5. 后端服务：选择「不使用云服务」
6. 点击「确定」

---

## 步骤 4：编译预览

导入后，开发者工具会自动编译。检查：

- [ ] 控制台无红色报错
- [ ] 登录页能正常显示验证码图片
- [ ] 登录后能进入首页 Dashboard
- [ ] 各列表页数据正常加载
- [ ] 详情页跳转正常

如有报错，根据控制台提示修复。

---

## 步骤 5：上传代码（体验版）

1. 点击开发者工具右上角「上传」按钮
2. 填写版本号（如 `1.0.0`）和项目备注
3. 点击「上传」

上传成功后：

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入「版本管理」→「开发版本」
3. 点击「体验版」→ 设置体验版
4. 扫码体验或添加体验成员（最多 15-30 人）

---

## 步骤 6：提交审核（正式发布）

如需正式发布：

1. 公众平台 → 「版本管理」→「开发版本」
2. 点击「提交审核」
3. 填写功能页面（首页、登录页等）
4. 提交审核（1-7 个工作日）

> 纯数据查询展示类小程序审核较宽松，通常 1-3 天通过。

---

## 常见问题

### Q1: 请求失败，提示「不在以下 request 合法域名列表中」
**解决**：检查步骤 2 是否已在公众平台配置域名，且域名与 `app-config.js` 中的 `apiHost` 完全一致（包括 `https://` 前缀）。

### Q2: 登录接口返回 401
**解决**：检查 `api.js` 中的 `x-session` Header 是否正确传递。首次登录后，token 应存储在 `Storage` 中并在后续请求携带。

### Q3: 验证码图片不显示
**解决**：确认 `/api/auth/captcha` 接口已加入 request 合法域名，且返回的是 base64 图片数据。

### Q4: 详情页白屏
**解决**：检查详情页 `onLoad` 中 `options.id` 是否正确传递。部分页面可能需要 `options.SalesOrder` 或 `options.ProductionOrder` 作为参数名。

---

## 文件清单（部署前检查）

| 文件 | 检查项 |
|------|--------|
| `app-config.js` | `apiHost` 是否为生产域名 |
| `app.json` | `appid` 是否已填写 |
| `utils/api.js` | 是否正确引用 `app-config.js` |
| `images/*.png` | tabBar 图标是否存在（81×81） |
