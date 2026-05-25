# 直播聊天 Demo - GitHub Pages 版本

这个目录已经整理成适合提交到 GitHub 并通过 GitHub Pages 访问的版本。

## 可以直接发布到 GitHub Pages 的内容

- `index.html`
- `styles.css`
- `app-h5.js`
- `admin.html`
- `admin.css`
- `admin.js`
- 微信小程序相关文件：`app.json`、`pages/`、`utils/`

GitHub Pages 只能托管静态文件，所以 H5 页面可以直接访问，但 PHP 接口和 WebSocket 服务不会在 GitHub Pages 上运行。

## 不能放到 GitHub Pages 上运行的内容

- `api/*.php`：需要 PHP + MySQL 环境
- `server/server.js`：需要 Node.js 环境
- `api/config.php`：真实数据库密码、云信 AppSecret 等敏感配置，已从本目录删除，并已加入 `.gitignore`

如果后续要部署登录、验证码或云信账号注册接口，请在自己的 PHP 服务器上复制：

```text
api/config.example.php -> api/config.php
```

然后在服务器上的 `api/config.php` 里填写真实配置。不要把真实 `api/config.php` 提交到 GitHub。

## 上传到 GitHub

在当前目录执行：

```bash
git init
git branch -M main
git add .
git commit -m "Initial GitHub Pages site"
git remote add origin https://github.com/你的用户名/你的仓库名.git
git push -u origin main
```

## 开启 GitHub Pages

进入 GitHub 仓库页面：

```text
Settings -> Pages -> Build and deployment
```

选择：

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

保存后等待一两分钟，访问地址一般是：

```text
https://你的用户名.github.io/你的仓库名/
```

## H5 页面示例地址

```text
https://你的用户名.github.io/你的仓库名/#/play?roomId=907&pullUrl=https%3A%2F%2Fexample.com%2Flive%2F907.m3u8
```

如果要开启聊天、登录、验证码等能力，需要把接口部署到支持后端的服务器，然后在页面里使用 HTTPS / WSS 地址。

## 本地聊天服务示例

`server` 目录只是本地测试用 WebSocket 示例：

```bash
cd server
npm install
npm start
```

本地默认地址：

```text
ws://127.0.0.1:8787
```

上线环境需要改成带 HTTPS 证书的：

```text
wss://你的后端域名/ws
```

## 注意事项

- H5 直播播放建议使用 `.m3u8` 地址。
- 页面中引用的直播流、图片、接口都要允许跨域访问。
- 微信内访问时，直播流和接口都建议使用 HTTPS。
- 小程序上线还需要按微信后台要求配置合法域名和直播相关权限。
