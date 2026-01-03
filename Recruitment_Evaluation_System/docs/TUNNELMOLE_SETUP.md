# Tunnelmole 设置指南

## 概述

Tunnelmole 用于将本地后端 API（端口 5000）暴露到公网，使 Google Apps Script 能够访问。

## 运行方式

Tunnelmole 通过 Docker Compose 运行，与项目其他服务统一管理。

**优点**：
- 统一管理，与项目其他服务一致
- 不需要在主机安装 Node.js
- 可以随 Docker Compose 一起启动/停止

## 使用步骤

### 1. 启动 Tunnelmole

Tunnelmole 会在启动系统时自动启动：

```bash
./start.sh
```

或者单独启动 Tunnelmole：

```bash
docker-compose --profile tunnelmole up -d tunnelmole
```

### 2. 获取公网 URL

查看日志获取 Tunnelmole URL：

```bash
# 获取 HTTPS URL（推荐）
docker-compose logs tunnelmole | grep 'https://'

# 或实时查看所有日志
docker-compose logs -f tunnelmole
```

启动后，Tunnelmole 会显示类似以下的信息：

```
https://xxxxx.tunnelmole.net is forwarding to localhost:5000
http://xxxxx.tunnelmole.net is forwarding to localhost:5000
```

**重要**：使用 **HTTPS URL**（以 `https://` 开头的），不要使用 HTTP URL，因为 HTTPS 更安全。

### 3. 确保 Google Form 包含邮箱字段

**重要**：Google Form 中必须包含一个邮箱字段，因为所有用户必须先注册才能提交表单。

- 问题标题必须包含 "email" 或 "e-mail"（不区分大小写）
- 例如："Your Email"、"Email Address"、"E-mail" 等
- 用户提交表单时，必须填写他们在系统中注册时使用的邮箱地址

### 4. 创建并配置 Google Apps Script 项目

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

### 4. 检查并设置触发器

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

### 启动服务

```bash
docker-compose --profile tunnelmole up -d tunnelmole
```

### 停止服务

```bash
docker-compose --profile tunnelmole stop tunnelmole
```

### 查看日志

```bash
docker-compose logs -f tunnelmole
```

### 重启服务

```bash
docker-compose --profile tunnelmole restart tunnelmole
```

## 注意事项

1. **Google Form 必须包含邮箱字段**：
   - 问题标题必须包含 "email" 或 "e-mail"（不区分大小写）
   - 例如："Your Email"、"Email Address" 等
   - 用户必须填写注册时使用的邮箱地址

2. **用户必须先注册**：
   - 所有用户必须先注册（http://localhost:3000/register）
   - 如果用户未注册，表单提交会失败并记录错误

3. **保持 Tunnelmole 运行**：Tunnelmole 容器需要持续运行才能保持连接。停止容器会断开连接。

4. **URL 会变化**：每次启动 Tunnelmole，URL 可能会不同。如果 URL 变化，需要更新 Google Apps Script。

5. **后端服务依赖**：确保后端服务（backend）正在运行，Tunnelmole 才能正常工作。

6. **生产环境**：对于生产环境，建议使用固定的域名和 HTTPS。

## 故障排除

### Tunnelmole 无法启动

- 检查后端服务是否运行：`docker-compose ps`
- 检查端口 5000 是否被占用：`docker-compose ps backend`
- 查看 Tunnelmole 日志：`docker-compose logs tunnelmole`

### Google Apps Script 无法连接

- 检查 Tunnelmole 是否正在运行：`docker-compose ps tunnelmole`
- 验证 URL 是否正确（包含 `https://` 和 `/api/form/submit`）
- 查看 Google Apps Script 的执行日志
- 测试 Tunnelmole URL 是否可访问：`curl https://xxxxx.tunnelmole.net/api/form/submit`

### 提交未同步

- 检查后端日志：`docker-compose logs -f backend | grep -i form`
- 检查 Tunnelmole 日志：`docker-compose logs tunnelmole`
- 检查数据库是否有新记录
- 验证触发器是否已设置
- 检查 Google Apps Script 的执行日志
- **检查用户是否已注册**：如果看到 "User not found" 错误，用户需要先注册

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
