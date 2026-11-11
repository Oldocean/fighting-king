# 🌐 免费在线部署指南

本指南帮你把格斗游戏部署到**免费云平台**，让你和朋友跨城市对战。

---

## 📋 前置条件

你需要：
- 一个 **GitHub 账号**（免费注册：https://github.com）
- 一个 **Render 账号**（用 GitHub 登录即可：https://render.com）

不需要信用卡，不需要购买服务器。

---

## 🚀 方案一：Render（推荐，最简单）

### 第 1 步：创建 GitHub 仓库

1. 打开 https://github.com → 点右上角 **+** → **New repository**
2. 仓库名填 `fighting-king`
3. 选 **Public**（公开）
4. **不要**勾选 "Add a README file"（我们已有）
5. 点 **Create repository**

### 第 2 步：上传代码到 GitHub

在你电脑上打开终端（macOS 用 Terminal，Windows 用 CMD/PowerShell）：

```bash
# 进入项目目录
cd fighting-game

# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "格斗之王 v2.0"

# 连接到你的 GitHub 仓库（把 YOUR_USERNAME 换成你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/fighting-king.git

# 推送
git branch -M main
git push -u origin main
```

### 第 3 步：在 Render 部署

1. 打开 https://dashboard.render.com → 用 GitHub 登录
2. 点 **New +** → **Web Service**
3. 选择 **Build and deploy from a Git repository** → **Next**
4. 找到你的 `fighting-king` 仓库 → 点 **Connect**
5. 填写配置：

| 配置项 | 值 |
|--------|-----|
| **Name** | `fighting-king`（或你喜欢的名字） |
| **Region** | 选离你近的（如 Singapore / Oregon） |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |

6. 点 **Create Web Service**
7. 等待部署完成（约 2-5 分钟）

### 第 4 步：开始对战！

部署成功后，Render 会给你一个地址，类似：
```
https://fighting-king.onrender.com
```

- **你**：打开这个网址 → 选「在线对战」→ 按 Enter → 按 `1` 创建房间
- **朋友**：打开同一个网址 → 选「在线对战」→ 按 Enter → 按 `2` → 输入你的房间号

---

## ⚠️ Render 免费版的限制

| 限制 | 说明 |
|------|------|
| **休眠** | 15 分钟无人访问后服务器休眠 |
| **冷启动** | 下次访问需要等待 30-60 秒唤醒 |
| **资源** | 512 MB 内存、0.1 CPU（对本游戏足够） |

**对战建议**：开始玩之前先访问一次网址，等服务器唤醒后再开始。

---

## 🔄 方案二：Suga（始终在线，不休眠）

如果你不想等待冷启动，可以试试 Suga：

1. 打开 https://suga.io → 注册账号
2. 创建新项目 → 连接 GitHub 仓库
3. 选择 Node.js 运行时
4. 部署

Suga 免费版提供 0.5 vCPU / 1GB 内存，服务始终运行。

---

## 🔄 方案三：本地 + ngrok（临时方案）

如果你只是偶尔和朋友玩，可以用 ngrok 临时暴露本地服务器：

```bash
# 终端 1：启动游戏服务器
cd fighting-game
npm start

# 终端 2：启动 ngrok 隧道
# 先安装 ngrok: brew install ngrok (macOS) 或去 https://ngrok.com 下载
ngrok http 3000
```

ngrok 会给你一个公网地址，如 `https://xxxx.ngrok-free.app`，把这个地址发给朋友即可。

**注意**：ngrok 免费版每次重启地址会变。

---

## 🔧 更新代码

如果你修改了代码，更新部署：

```bash
cd fighting-game
git add .
git commit -m "更新说明"
git push
```

Render 会自动重新部署。

---

## ❓ 常见问题

### Q: 朋友打开网址显示空白？
A: 按 F12 打开开发者工具，查看 Console 是否有报错。可能是浏览器缓存，按 Ctrl+Shift+R 强制刷新。

### Q: 连接服务器失败？
A: 
1. 确认 Render 上的服务状态是 **Live**
2. 第一次访问可能需要等待冷启动（30-60秒）
3. 检查浏览器地址栏是否是 `https://` 开头

### Q: 对战时有延迟？
A: 
1. 选择离你们都近的 Render 区域（如 Singapore）
2. 当前版本使用输入同步，延迟 100ms 以内体验较好
3. 如果延迟过大，可以考虑部署到离你们更近的平台

### Q: 可以手机玩吗？
A: 当前版本使用键盘操作，不支持触屏。可以在电脑上玩。

---

## 📁 项目文件说明

```
fighting-game/
├── index.html       # 游戏主文件（前端）
├── server.js        # WebSocket 服务器
├── package.json     # Node.js 依赖
├── render.yaml      # Render 部署配置
├── .gitignore       # Git 忽略文件
└── README.md        # 使用说明
```
