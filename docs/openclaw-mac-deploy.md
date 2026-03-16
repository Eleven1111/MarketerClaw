# OpenClaw Mac 部署说明

这份说明适用于：
- 目标机器是 macOS
- 机器上已经有 `openclaw`
- 你要把当前项目作为 `openclaw` 机器上的一个并行子服务运行
- 访问路径希望是 `/marketing`

## 1. 放到目标机器

建议目录：

```bash
~/openclaw/MarketerClaw
```

当前机器打包：

```bash
cd "<your-project-dir>"
tar --exclude='node_modules' --exclude='.git' -czf MarketerClaw.tgz .
scp MarketerClaw.tgz 用户名@目标Mac:~/openclaw/
```

目标机器解压：

```bash
cd ~/openclaw
mkdir -p MarketerClaw
tar -xzf MarketerClaw.tgz -C MarketerClaw
cd MarketerClaw
```

## 2. 环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

推荐配置：

```env
PORT=8788
NODE_ENV=production
APP_BASE_PATH=/marketing

# 可选：如果你希望服务端统一托管模型密钥，可配置这些变量
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=

GOOGLE_API_KEY=
GOOGLE_MODEL=

VOLCENGINE_API_KEY=
VOLCENGINE_MODEL=
```

说明：
- `APP_BASE_PATH=/marketing` 表示前端和 API 都会挂在 `/marketing` 下
- 访问地址会变成 `http://127.0.0.1:8788/marketing`
- 健康检查会变成 `http://127.0.0.1:8788/marketing/api/health`
- 如果上面这些模型环境变量已经配好，页面里的 `apiKey` 可以留空

## 3. 安装和构建

```bash
cd ~/openclaw/MarketerClaw
node -v
npm -v
npm install
APP_BASE_PATH=/marketing npm run build
```

## 4. 前台验证启动

```bash
cd ~/openclaw/MarketerClaw
APP_BASE_PATH=/marketing PORT=8788 NODE_ENV=production npm run start
```

另开一个终端验证：

```bash
curl http://127.0.0.1:8788/marketing/api/health
```

成功后浏览器打开：

```bash
http://127.0.0.1:8788/marketing
```

## 5. 配置 launchd 常驻

新建文件：

```bash
mkdir -p ~/Library/LaunchAgents
cat > ~/Library/LaunchAgents/com.openclaw.marketerclaw.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.openclaw.marketerclaw</string>

    <key>ProgramArguments</key>
    <array>
      <string>/bin/zsh</string>
      <string>-lc</string>
      <string>cd ~/openclaw/MarketerClaw && npm run start</string>
    </array>

    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>

    <key>StandardOutPath</key>
    <string>/tmp/marketerclaw.out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/marketerclaw.err.log</string>
  </dict>
</plist>
EOF
```

加载并启动：

```bash
launchctl unload ~/Library/LaunchAgents/com.openclaw.marketerclaw.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.openclaw.marketerclaw.plist
launchctl start com.openclaw.marketerclaw
```

查看日志：

```bash
tail -f /tmp/marketerclaw.out.log
tail -f /tmp/marketerclaw.err.log
```

## 6. 接到 OpenClaw

当前版本已经支持子路径部署，所以最合适的接法是：

- 让 `openclaw` 机器上的反向代理把 `/marketing` 转发到 `http://127.0.0.1:8788/marketing`
- 或者在 `openclaw` 的导航里直接放一个链接，指向 `/marketing`

如果你暂时没有代理层，也可以先直接访问：

```bash
http://127.0.0.1:8788/marketing
```

## 7. 数据与安全

- 工作流数据落盘目录：`server/data/workflows`
- 新版本会在启动时自动清理历史文件中的明文 `apiKey`
- 新生成的工作流记录也不会把明文 `apiKey` 写进磁盘

## 8. 更新发布

每次你从这台开发机重新同步过去后，在目标机器执行：

```bash
cd ~/openclaw/MarketerClaw
npm install
APP_BASE_PATH=/marketing npm run build
launchctl kickstart -k gui/$(id -u)/com.openclaw.marketerclaw
```
