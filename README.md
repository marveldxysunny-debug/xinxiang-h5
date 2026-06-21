# 心象祝符 H5 部署说明

把本目录下的文件上传到静态网站托管即可：

- `index.html`
- `invite.html`
- `charm.html`
- `app.css`
- `app.js`
- `data.bundle.js`
- `assets/qrcode/xinxiang-shicheng.jpg`
- `assets/qrcode/xinxiang-logo-full-dark.png`

入口文件是 `index.html`。部署后，首页链接类似：

```txt
https://你的域名/index.html
```

H5 会自动生成可分享的好友加持链接，格式类似：

```txt
https://你的域名/invite.html?share=eyJ2IjoxLCJwIjoieGlueGlhbmctc2hpY2hlbmci...
```

公开祝符链接格式类似：

```txt
https://你的域名/charm.html?share=eyJ2IjoxLCJwIjoieGlueGlhbmctc2hpY2hlbmci...
```

旧版 `index.html?mode=bless&resultId=...` 链接仍然兼容，但新生成的链接会使用包装后的 `share` 参数。

如果用本地 `file://` 打开，页面可以预览，但生成的链接只适合本机访问。要发给别人打开，需要先部署到公网 HTTPS 静态托管服务，并把整个 `h5` 目录完整上传。
