# Google Apps Script 完整指南

本指南涵盖从项目创建到问题排查的完整流程。

## 目录

1. [项目创建](#项目创建)
2. [配置项目](#配置项目)
3. [授权访问](#授权访问)
4. [设置触发器](#设置触发器)
5. [同步历史数据](#同步历史数据)
6. [查看日志和调试](#查看日志和调试)
7. [问题排查](#问题排查)
8. [常见问题](#常见问题)

---

## 项目创建

### 方法 1：从 Google Form 创建（推荐）

1. **打开你的 Google Form**
   - 访问 https://forms.google.com
   - 打开你的表单

2. **打开脚本编辑器**
   - 点击表单右上角的三个点菜单（⋮）
   - 选择"脚本编辑器"
   - 这会自动创建一个与表单关联的 Google Apps Script 项目

3. **复制代码**
   - 删除编辑器中的默认代码
   - 复制 `google-apps-script/Code.gs` 文件中的内容
   - 粘贴到编辑器中

4. **保存项目**
   - 点击"文件" → "保存" 或使用快捷键 `Ctrl+S` / `Cmd+S`
   - 给项目起个名字，例如："Form Submission Sync"

### 方法 2：从 Google Apps Script 创建

1. **访问 Google Apps Script**
   - 打开 https://script.google.com
   - 使用你的 Google 账户登录

2. **创建新项目**
   - 点击左上角的"新建项目"（+）
   - 或点击"空白项目"

3. **复制代码**
   - 删除编辑器中的默认代码
   - 复制 `google-apps-script/Code.gs` 文件中的内容
   - 粘贴到编辑器中

4. **保存项目**
   - 点击"文件" → "保存"
   - 给项目起个名字

5. **关联 Google Form**
   - 确保 `CONFIG.FORM_ID` 设置为你的表单 ID
   - 确保你有访问该表单的权限

---

## 配置项目

### 1. 获取 Tunnelmole URL

1. **启动 Tunnelmole**
   ```bash
   # Tunnelmole 会在系统启动时自动启动
   ./start.sh
   
   # 或单独启动
   docker-compose --profile tunnelmole up -d tunnelmole
   ```

2. **获取 HTTPS URL**
   ```bash
   # 获取 HTTPS URL（推荐使用）
   docker-compose logs tunnelmole | grep 'https://'
   # 或实时查看所有日志
   docker-compose logs -f tunnelmole
   ```

3. **复制 URL**
   - 复制 HTTPS URL（例如：`https://xxxxx.tunnelmole.net`）
   - 注意：使用 HTTPS URL，不要使用 HTTP URL

### 2. 获取表单 ID

#### 方法 1：从 URL 中查看（最简单）

1. **打开你的 Google Form**
2. **查看浏览器地址栏的 URL**
   - URL 格式：`https://docs.google.com/forms/d/FORM_ID/edit`
   - `FORM_ID` 就是表单 ID

#### 方法 2：使用代码查看

在 Google Apps Script 编辑器中运行 `getFormId()` 函数，查看日志获取表单 ID。

### 3. 更新配置

在 `Code.gs` 中更新以下配置：

```javascript
const CONFIG = {
  API_URL: 'https://xxxxx.tunnelmole.net/api/form/submit', // 使用你的 Tunnelmole URL
  FORM_ID: '1MW-56aoEWSO8slPNnqgBQohW5Ahp-b6IHE4O7589kuU', // 使用你的表单 ID
};
```

### 4. 测试 API 连接

1. **运行测试函数**
   - 在 Google Apps Script 编辑器中
   - 选择函数 `testConnection`
   - 点击运行按钮（▶️）

2. **查看执行日志**
   - 如果看到 `Response Code: 201` 和 `Submission sent successfully`，说明 API 连接正常

---

## 授权访问

### 授权警告说明

首次运行函数时，可能会看到警告：

> "The app is requesting access to sensitive info in your Google Account. Until the developer verifies this app with Google, you shouldn't use it."

**这是正常的**，因为这是你自己创建的脚本，还没有经过 Google 验证。对于个人使用的脚本，可以安全地继续授权。

### 授权步骤

1. **运行函数**
   - 选择要运行的函数（例如：`setupTrigger`）
   - 点击运行按钮（▶️）

2. **处理警告（如果出现）**
   - 点击"高级"或"Show advanced"
   - 然后点击"转到 [项目名称]（不安全）"或"Go to [项目名称] (unsafe)"
   - 如果看不到"高级"选项，直接点击"授权访问"

3. **选择账户**
   - 选择你要使用的 Google 账户
   - 确保这是拥有表单访问权限的账户

4. **查看权限请求**
   - 会显示脚本请求的权限列表：
     - 查看和管理你的 Google Forms
     - 连接到外部服务（你的 API）

5. **允许权限**
   - 点击"允许"或"Allow"
   - 确认授权

6. **完成授权**
   - 函数会开始执行
   - 查看执行日志确认是否成功

### 权限说明

脚本需要的权限：
- **访问 Google Forms**：用于读取表单提交数据和创建触发器
- **访问外部 URL**：用于调用后端 API 发送数据

### 撤销授权

如果需要撤销授权：
1. 访问 https://myaccount.google.com/permissions
2. 找到你的 Google Apps Script 项目
3. 点击"移除访问权限"

---

## 设置触发器

### 检查触发器是否存在

#### 方法 1：使用代码检查（推荐）

1. 在 Google Apps Script 编辑器中，选择函数 `checkTrigger`
2. 点击运行按钮（▶️）
3. 查看执行日志：
   - 如果显示 "Trigger found"，说明触发器已存在
   - 如果显示 "No trigger found"，说明需要创建触发器

#### 方法 2：手动检查

1. 在 Google Apps Script 编辑器中
2. 点击左侧的"触发器"图标（⏰）
3. 查看触发器列表：
   - 如果有 `onFormSubmit` 函数，事件类型为 `从表单提交`，说明触发器已存在

### 创建触发器

#### 方法 1：使用代码设置（推荐）

1. 在 Google Apps Script 编辑器中，选择函数 `setupTrigger`
2. 点击运行按钮（▶️）
3. 首次运行需要授权（参考[授权访问](#授权访问)部分）
4. 查看执行日志：
   - 如果显示 "Trigger created successfully"，说明触发器创建成功
   - 如果显示 "Trigger already exists"，说明触发器已存在

#### 方法 2：手动设置

1. 在 Google Apps Script 编辑器中
2. 点击左侧的"触发器"图标（⏰）
3. 点击右下角的"添加触发器"（+）
4. 配置触发器：
   - **函数**：选择 `onFormSubmit`
   - **事件源**：选择 `从表单提交`
   - **表单**：选择你的 Google Form
   - **失败通知设置**：选择"立即通知我"
5. 点击"保存"

### 验证触发器

1. **提交测试表单**
   - 打开你的 Google Form
   - 填写并提交表单

2. **检查执行日志**
   - 在 Google Apps Script 编辑器中
   - 点击左侧的"执行"图标（▶️）
   - 查看最近的执行记录
   - 应该能看到 `onFormSubmit` 函数的执行记录

3. **检查后端日志**
   ```bash
   docker-compose logs -f backend | grep -i form
   ```

4. **检查数据库**
   ```bash
   docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT * FROM form_submissions ORDER BY submitted_at DESC LIMIT 5;"
   ```

5. **检查 Staff 页面**
   - 登录 Staff 账户
   - 进入 "Form Submissions" 标签
   - 应该能看到新提交的数据

### 删除触发器

如果需要删除触发器：
1. 在 Google Apps Script 编辑器中
2. 点击左侧的"触发器"图标（⏰）
3. 找到 `onFormSubmit` 触发器
4. 点击右侧的"删除"图标（🗑️）
5. 确认删除

---

## 同步历史数据

触发器只会在新提交时触发，不会自动同步历史提交。如果需要同步历史提交，使用以下方法：

### 方法 1：使用 SyncHistory.gs（推荐）

1. **复制 SyncHistory.gs**
   - 在 Google Apps Script 项目中创建新文件
   - 复制 `google-apps-script/SyncHistory.gs` 的内容

2. **更新配置**
   - 更新 `SYNC_CONFIG.API_URL` 为你的 Tunnelmole URL
   - 更新 `SYNC_CONFIG.FORM_ID` 为你的表单 ID

3. **测试同步**（可选）
   - 运行 `syncHistoryTest()` 函数
   - 这会同步第一个提交，用于测试配置是否正确

4. **运行完整同步**
   - 运行 `syncHistory()` 函数
   - 查看执行日志确认同步进度
   - 日志会显示成功、跳过（用户未注册）和错误的统计

**优势**：
- 直接在 Google Apps Script 中运行，无需导出数据
- 自动处理所有历史提交
- 提供详细的同步统计
- 如果用户未注册，会自动跳过（不会失败）

### 方法 2：使用后端 API

1. **从 Google Form 导出数据**
   - 打开 Google Form
   - 点击 "Responses" 标签
   - 点击右上角的三点菜单
   - 选择 "Download responses (.csv)"

2. **使用手动同步 API**
   - 需要 staff 权限
   - 使用 curl 命令：
   ```bash
   curl -X POST http://localhost:5000/api/form/sync-manual \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "submissions": [
         {
           "email": "user@example.com",
           "form_id": "1MW-56aoEWSO8slPNnqgBQohW5Ahp-b6IHE4O7589kuU",
           "submission_data": {
             "Your Name": "Tim",
             "Your Nationality": "Chinese"
           }
         }
       ]
     }'
   ```

### 方法 3：使用 Node.js 脚本

- 使用 `server/scripts/import-form-submissions.js`
- 在本地运行，直接操作数据库
- 适合批量导入历史数据

---

## 查看日志和调试

### 访问执行日志

#### 方法 1：通过执行记录查看（推荐）

1. **打开 Google Apps Script 编辑器**
   - 访问 https://script.google.com
   - 打开你的项目

2. **找到"执行"图标**
   - 在编辑器左侧侧边栏中
   - 点击 **▶️ 执行（Executions）** 图标

3. **查看执行记录**
   - 显示所有函数的执行历史记录
   - 记录按时间倒序排列
   - 每条记录显示：执行时间、状态、函数名称、执行时长

4. **查看详细信息**
   - 点击任意一条执行记录
   - 可以看到详细信息
   - 点击"查看日志"可以查看详细的日志输出

#### 方法 2：通过日志查看器

1. **打开日志查看器**
   - 在代码编辑器中
   - 点击菜单栏的"查看" → "日志"
   - 或使用快捷键 `Ctrl+Shift+Y` (Windows/Linux) 或 `Cmd+Shift+Y` (Mac)

2. **查看日志输出**
   - 日志会显示所有 `Logger.log()` 的输出
   - 包括错误信息和调试信息

### 理解日志信息

#### 成功执行的日志

```
Sending to API: https://xxxxx.tunnelmole.net/api/form/submit
Data: {"email":"test@example.com",...}
Response Code: 201
Response: {"data":{...}}
Submission sent successfully
```

**含义**：API 调用成功，数据已发送到后端

#### 错误日志

**1. API 连接错误**
```
Error sending to API: Error: Request failed for https://xxxxx.tunnelmole.net returned code 404
```

**可能原因**：
- Tunnelmole URL 不正确
- 后端服务未运行
- API 路径错误

**解决方法**：
- 检查 `CONFIG.API_URL` 是否正确
- 确认 Tunnelmole 正在运行：`docker-compose ps tunnelmole`
- 检查后端服务：`docker-compose ps backend`

**2. 用户未找到错误**
```
ERROR: User not found. User must register first before submitting the form.
```

**含义**：用户未注册，提交被跳过

**解决方法**：
- 确保用户已注册（http://localhost:3000/register）
- 确保表单中的邮箱与注册邮箱一致

**3. 邮箱字段未找到**
```
ERROR: No email found in form submission. User must provide email in the form.
```

**含义**：表单中没有找到邮箱字段

**解决方法**：
- 确保表单中包含邮箱字段
- 问题标题必须包含 "email" 或 "e-mail"（不区分大小写）

### 调试技巧

1. **添加更多日志**
   - 在代码中添加 `Logger.log()` 语句
   - 记录关键步骤和数据

2. **测试 API 连接**
   - 运行 `testConnection()` 函数
   - 查看日志确认 API 连接正常

3. **检查触发器**
   - 运行 `checkTrigger()` 函数
   - 查看日志确认触发器是否存在

---

## 问题排查

### 问题 1：Google Form 有提交记录，但 Staff 页面没有显示

**可能原因**：

1. **Google Apps Script 无法访问 localhost**
   - Google Apps Script 运行在云端，无法访问本地的 `http://localhost:5000`
   - **解决方法**：使用 Tunnelmole 暴露本地 API

2. **触发器未设置**
   - **解决方法**：运行 `setupTrigger()` 函数创建触发器

3. **现有提交未同步**
   - 触发器只会在新提交时触发，不会同步历史提交
   - **解决方法**：使用 `SyncHistory.gs` 同步历史提交

### 问题 2：触发器没有触发

**检查步骤**：

1. **检查触发器配置**
   - 运行 `checkTrigger()` 函数
   - 或手动检查触发器列表

2. **检查执行日志**
   - 查看是否有错误信息
   - 检查 API URL 是否正确

3. **检查权限**
   - 确保脚本有访问表单的权限
   - 确保脚本有访问外部 URL 的权限

### 问题 3：API 连接失败

**检查步骤**：

1. **检查 Tunnelmole**
   ```bash
   docker-compose ps tunnelmole
   docker-compose logs tunnelmole
   ```

2. **检查后端服务**
   ```bash
   docker-compose ps backend
   docker-compose logs backend | grep -i form
   ```

3. **测试 API URL**
   - 运行 `testConnection()` 函数
   - 查看日志确认连接是否正常

### 问题 4：用户未找到错误

**可能原因**：
- 用户未注册
- 表单中的邮箱与注册邮箱不一致

**解决方法**：
- 确保用户已注册（http://localhost:3000/register）
- 确保表单中的邮箱与注册邮箱完全一致（大小写不敏感）

---

## 常见问题

### Q: 找不到"脚本编辑器"选项？

**A**: 可能的原因：
1. 你没有编辑表单的权限
2. 表单是只读模式
3. 浏览器不支持该功能

**解决方法**：
- 确保你是表单的所有者或编辑者
- 尝试从 Google Apps Script 创建独立项目

### Q: 如何找到我的项目？

**A**: 
1. 访问 https://script.google.com
2. 在左侧会显示所有项目列表
3. 如果项目很多，使用搜索框搜索项目名称

### Q: 授权警告安全吗？

**A**: 是的，完全安全。因为：
- 这是你自己创建和控制的脚本
- 代码完全在你的 Google Apps Script 项目中
- 你可以随时查看和修改代码

### Q: 如何验证应用？

**A**: 
- 对于个人使用的脚本，**不需要验证**
- 验证主要用于公开发布给其他用户使用的应用
- 个人脚本可以直接使用，无需验证

### Q: 触发器创建失败？

**A**: 可能的原因：
1. **检查表单 ID**
   - 确保 `CONFIG.FORM_ID` 正确
   - 确保你有访问该表单的权限

2. **检查授权**
   - 确保已授权脚本访问表单
   - 确保已授权脚本访问外部 URL

### Q: 日志显示成功，但后端没有收到数据？

**A**: 检查：
1. 后端日志：`docker-compose logs -f backend | grep -i form`
2. 数据库：`docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT * FROM form_submissions ORDER BY submitted_at DESC LIMIT 5;"`
3. Tunnelmole 连接：`docker-compose logs tunnelmole`

### Q: 如何查看已授权的应用？

**A**: 
1. 访问 https://myaccount.google.com/permissions
2. 查看"第三方访问权限"部分
3. 找到你的 Google Apps Script 项目

---

## 重要注意事项

1. **Google Apps Script 无法访问 localhost**：必须使用公网可访问的 URL（推荐使用 Tunnelmole）

2. **Google Form 必须包含邮箱字段**：问题标题必须包含 "email" 或 "e-mail"（不区分大小写）

3. **所有用户必须先注册**：用户必须先注册（http://localhost:3000/register）才能提交表单或同步历史提交

4. **触发器只同步新提交**：触发器只会在新提交时触发，不会自动同步历史提交

5. **同步历史提交**：使用 `SyncHistory.gs` 中的 `syncHistory()` 函数（推荐）

6. **建议定期检查日志**：定期检查 Google Apps Script 的执行日志，确保同步正常

---

## 相关文档

- [Google Apps Script README](../google-apps-script/README.md) - 详细的函数说明和使用方法
- [Tunnelmole 设置指南](TUNNELMOLE_SETUP.md) - Tunnelmole 详细配置说明

---

## 快速检查清单

完成以下步骤后，系统应该可以正常工作：

- [ ] 创建 Google Apps Script 项目
- [ ] 复制 `Code.gs` 代码
- [ ] 更新 `CONFIG.API_URL` 为 Tunnelmole URL
- [ ] 更新 `CONFIG.FORM_ID` 为表单 ID
- [ ] 运行 `testConnection()` 测试 API 连接
- [ ] 授权访问（首次运行函数时）
- [ ] 运行 `setupTrigger()` 创建触发器
- [ ] 提交测试表单验证触发器
- [ ] 检查执行日志确认同步成功
- [ ] （可选）使用 `SyncHistory.gs` 同步历史提交

