# Tunnelmole 设置指南

## 概述

Tunnelmole 用于将本地后端 API（端口 5001）暴露到公网，使 Google Apps Script 和 GitHub Pages 前端能够访问。

## 运行方式

Tunnelmole 在主机上运行（不在 Docker 中），直接连接到后端服务。

**架构**：
```
Tunnelmole (主机) → localhost:5001 → backend:5000 (Docker)
```

**优点**：
- 直接连接后端，无需额外的代理层
- 简化架构，减少资源消耗
- 易于管理和调试

## 使用步骤

### 1. 确保后端服务运行

首先确保后端服务正在运行：

```bash
docker-compose up -d backend
```

或者使用启动脚本启动所有服务：

```bash
./start.sh
```

### 2. 启动 Tunnelmole

**方法 1：使用启动脚本（推荐）**

```bash
./start-tunnelmole.sh
```

**方法 2：手动运行**

```bash
npx -y tunnelmole 5001
```

**方法 3：后台运行**

如果需要后台运行，可以使用：

```bash
nohup npx -y tunnelmole 5001 > tunnelmole.log 2>&1 &
```

### 3. 获取公网 URL

启动后，Tunnelmole 会在终端显示公网 URL。你会看到类似这样的输出：

```
Your Tunnelmole Public URLs are below and are accessible internet wide. Always use HTTPs for the best security

https://xxxxx-ip-xxx-xxx-xxx-xxx.tunnelmole.net ⟶   http://localhost:5001
http://xxxxx-ip-xxx-xxx-xxx-xxx.tunnelmole.net ⟶   http://localhost:5001
```

**重要**：
- 复制完整的 HTTPS URL（例如：`https://xxxxx.tunnelmole.net`）
- 如果后台运行，查看日志文件：`tail -f tunnelmole.log | grep 'https://'`

**重要**：使用 **HTTPS URL**（以 `https://` 开头的），不要使用 HTTP URL，因为 HTTPS 更安全。

### 4. 确保 Google Form 包含邮箱字段

**重要**：Google Form 中必须包含一个邮箱字段，因为所有用户必须先注册才能提交表单。

- 问题标题必须包含 "email" 或 "e-mail"（不区分大小写）
- 例如："Your Email"、"Email Address"、"E-mail" 等
- 用户提交表单时，必须填写他们在系统中注册时使用的邮箱地址

### 5. 创建并配置 Google Apps Script 项目

**如果还没有项目**：
- 参考：[Google Apps Script 完整指南](../google-apps-script/docs/GOOGLE_APPS_SCRIPT_COMPLETE_GUIDE.md)

**如果已有项目**：
1. 打开 `google-apps-script/Code.gs`
2. 更新 `CONFIG.API_URL`：

```javascript
const CONFIG = {
  API_URL: 'https://xxxxx.tunnelmole.net/api/form/submit', // 使用 Tunnelmole URL
  FORM_ID: 'jSnLjkfqetqdLgFr7',
};
```

### 6. 检查并设置触发器

**检查触发器是否存在**：
1. 在 Google Apps Script 编辑器中，选择函数 `checkTrigger`
2. 点击运行按钮，查看日志

**设置触发器**（如果不存在）：
1. 在 Google Apps Script 编辑器中，选择函数 `setupTrigger`
2. 点击运行按钮
3. 首次运行需要授权访问
4. 查看日志确认触发器创建成功

或者手动设置：
1. 点击左侧的"触发器"图标
2. 点击"添加触发器"
3. 配置：
   - 函数：`onFormSubmit`
   - 事件源：`从表单提交`
   - 选择你的表单

详细说明请参考：[Google Apps Script 完整指南](GOOGLE_APPS_SCRIPT_COMPLETE_GUIDE.md)

## 测试

### 测试 Tunnelmole 连接

```bash
./test-tunnelmole-connection.sh https://xxxxx.tunnelmole.net
```

### 检查数据库

```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT * FROM form_submissions ORDER BY submitted_at DESC LIMIT 5;"
```

## 管理命令

### 启动 Tunnelmole

**前台运行（推荐，可以看到实时输出）**：
```bash
./start-tunnelmole.sh
# 或
npx -y tunnelmole 5001
```

**后台运行**：
```bash
nohup npx -y tunnelmole 5001 > tunnelmole.log 2>&1 &
```

### 停止 Tunnelmole

**如果在前台运行**：
- 按 `Ctrl+C` 停止

**如果后台运行**：
```bash
# 方法 1: 查找并终止进程
pkill -f tunnelmole

# 方法 2: 查找进程 ID 然后终止
ps aux | grep tunnelmole
kill <PID>

# 方法 3: 终止所有 tunnelmole 进程
pkill -9 -f tunnelmole
```

### 查看日志

**如果前台运行**：
- 日志直接显示在终端

**如果后台运行**：
```bash
# 查看日志文件
tail -f tunnelmole.log

# 查看最后几行
tail -n 50 tunnelmole.log

# 搜索 URL
grep 'https://' tunnelmole.log
```

### 检查 Tunnelmole 是否运行

```bash
# 检查进程
ps aux | grep tunnelmole

# 检查端口（Tunnelmole 会连接到 localhost:5001）
netstat -an | grep 5001
```

### 重启 Tunnelmole

```bash
# 1. 停止当前进程
pkill -f tunnelmole

# 2. 等待几秒
sleep 2

# 3. 重新启动
./start-tunnelmole.sh
# 或
npx -y tunnelmole 5001
```

## 注意事项

1. **Google Form 必须包含邮箱字段**：
   - 问题标题必须包含 "email" 或 "e-mail"（不区分大小写）
   - 例如："Your Email"、"Email Address" 等
   - 用户必须填写注册时使用的邮箱地址

2. **用户必须先注册**：
   - 所有用户必须先注册（http://localhost:3000/register）
   - 如果用户未注册，表单提交会失败并记录错误

3. **保持 Tunnelmole 运行**：
   - Tunnelmole 进程需要持续运行才能保持连接
   - 如果在前台运行，不要关闭终端窗口
   - 如果后台运行，确保进程没有意外终止
   - 停止 Tunnelmole 会断开公网连接

4. **URL 会变化**：
   - 每次启动 Tunnelmole，URL 可能会不同
   - 如果 URL 变化，需要更新：
     - Google Apps Script 中的 `API_URL`
     - GitHub Secrets 中的 `NEXT_PUBLIC_API_URL`（用于 GitHub Pages）

5. **后端服务依赖**：
   - 确保后端服务（backend）正在运行：`docker-compose ps backend`
   - 确保后端端口 5001 可访问：`curl http://localhost:5001/api/health`
   - Tunnelmole 连接到 `localhost:5001`，如果后端未运行，Tunnelmole 无法工作

6. **生产环境**：
   - 对于生产环境，建议使用固定的域名和 HTTPS
   - 考虑使用付费的 Tunnelmole 订阅以获得固定域名

## 故障排除

### Tunnelmole 无法启动

**检查后端服务**：
```bash
# 检查后端是否运行
docker-compose ps backend

# 测试后端是否可访问
curl http://localhost:5001/api/health
```

**检查端口占用**：
```bash
# 检查端口 5001 是否被占用
lsof -i :5001
# 或
netstat -an | grep 5001
```

**查看错误信息**：
- 如果前台运行，查看终端输出
- 如果后台运行，查看日志：`tail -f tunnelmole.log`

### Tunnelmole 无法连接到后端

**症状**：Tunnelmole 启动但无法访问后端 API

**解决方法**：
1. 确保后端正在运行：`docker-compose ps backend`
2. 测试本地连接：`curl http://localhost:5001/api/health`
3. 如果返回错误，检查后端日志：`docker-compose logs backend`
4. 重启后端：`docker-compose restart backend`

### Google Apps Script 无法连接

**检查 Tunnelmole 是否运行**：
```bash
ps aux | grep tunnelmole
```

**验证 URL**：
- 确保 URL 包含 `https://`（不是 `http://`）
- 确保 URL 包含 `/api/form/submit` 路径
- 测试 URL 是否可访问：`curl https://xxxxx.tunnelmole.net/api/health`

**查看日志**：
- 如果后台运行：`tail -f tunnelmole.log`
- Google Apps Script 执行日志

### 提交未同步

**检查步骤**：
1. 检查后端日志：`docker-compose logs -f backend | grep -i form`
2. 检查 Tunnelmole 是否运行：`ps aux | grep tunnelmole`
3. 如果后台运行，查看日志：`tail -f tunnelmole.log`
4. 检查数据库是否有新记录：
   ```bash
   docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT * FROM form_submissions ORDER BY submitted_at DESC LIMIT 5;"
   ```
5. 验证触发器是否已设置（在 Google Apps Script 中）
6. 检查 Google Apps Script 的执行日志
7. **检查用户是否已注册**：如果看到 "User not found" 错误，用户需要先注册

### 用户未找到错误

如果看到 "User not found" 错误：

1. **确认用户已注册**：
   - 用户必须先在 http://localhost:3000/register 注册
   - 注册时使用的邮箱必须与表单中填写的邮箱一致

2. **检查邮箱匹配**：
   - 确保表单中的邮箱与注册邮箱完全一致（大小写不敏感）
   - 检查是否有空格或其他字符

3. **查看错误日志**：
   - Google Apps Script 执行日志会显示详细的错误信息
   - 后端日志会显示 "User not found" 和邮箱地址

### 邮箱字段未找到错误

如果看到 "Email is required" 错误：

1. **检查 Google Form 配置**：
   - 确保表单中包含一个邮箱字段
   - 问题标题必须包含 "email" 或 "e-mail"（不区分大小写）
   - 例如："Your Email"、"Email Address"、"E-mail" 等

2. **测试表单**：
   - 提交测试表单，检查 Google Apps Script 执行日志
   - 日志会显示提取到的表单数据
