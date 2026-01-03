# Recruitment Evaluation System

招聘评估系统 - 一个全栈Web应用，用于管理虚拟跑步数据、在线测验和Google表单提交。

## 📋 目录

- [项目概述](#项目概述)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [项目结构](#项目结构)
- [文件说明](#文件说明)
- [快速开始](#快速开始)
- [测试指南](#测试指南)

## 项目概述

本系统提供两个主要入口：
- **用户端 (User Portal)**: 普通用户上传虚拟跑步数据、参加测验、填写表单
- **管理端 (Staff Portal)**: 管理员查看所有用户数据、管理测验题目、配置表单

### 核心功能

- ✅ 用户注册和登录（邮箱/密码）
- ✅ 虚拟跑步数据上传（支持图片）
- ✅ 在线测验系统（支持选择题和文本题）
- ✅ Google表单集成
- ✅ 数据可视化（图表展示）
- ✅ 角色权限管理（user/manager/staff）

## 技术栈

### 后端
- **Node.js** + **Express**: RESTful API服务器
- **PostgreSQL**: 关系型数据库
- **JWT**: 用户认证
- **bcryptjs**: 密码加密
- **Multer**: 文件上传处理

### 前端
- **Next.js**: React框架
- **TypeScript**: 类型安全
- **Chart.js**: 数据可视化
- **Axios**: HTTP客户端

### 部署
- **Docker** + **Docker Compose**: 容器化部署
- **PostgreSQL 15**: 数据库容器

## 系统架构

```
┌─────────────────┐         ┌─────────────────┐
│  User Portal    │         │  Staff Portal   │
│  (Port 3000)    │         │  (Port 3001)    │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └───────────┬───────────────┘
                     │
              ┌──────▼──────┐
              │ Backend API │
              │(Port 5000)  │
              └──────┬──────┘
                     │
              ┌──────▼──────┐
              │ PostgreSQL  │
              │ (Port 5432) │
              └─────────────┘
```

### 数据流

1. **用户注册/登录** → 后端验证 → 生成JWT Token → 前端存储
2. **数据提交** → 前端 → API → 数据库
3. **数据查询** → 数据库 → API → 前端展示

## 项目结构

```
Recruitment_Evaluation_System/
├── client/                 # 前端应用
│   ├── src/
│   │   ├── pages/         # 页面组件
│   │   │   ├── index.tsx          # 首页（路由重定向）
│   │   │   ├── login.tsx          # 登录页
│   │   │   ├── register.tsx       # 注册页
│   │   │   ├── user/              # 用户端页面
│   │   │   │   └── index.tsx       # 用户仪表板
│   │   │   └── staff/             # 管理端页面
│   │   │       └── index.tsx      # 管理仪表板
│   │   ├── utils/
│   │   │   └── api.ts             # API请求封装
│   │   └── _app.tsx               # Next.js应用入口
│   ├── package.json
│   └── Dockerfile
│
├── server/                 # 后端应用
│   ├── routes/            # API路由
│   │   ├── auth.js                # 认证路由（注册/登录）
│   │   ├── user.js                # 用户信息路由
│   │   ├── staff.js               # 管理端路由
│   │   ├── virtualRun.js           # 虚拟跑步路由
│   │   ├── quiz.js                 # 测验路由
│   │   ├── form.js                 # 表单提交路由
│   │   └── formConfig.js           # 表单配置路由
│   ├── middleware/
│   │   └── auth.js                # 认证中间件
│   ├── config/
│   │   └── database.js            # 数据库配置和表初始化
│   ├── scripts/
│   │   ├── create-test-users.js   # 创建测试用户
│   │   ├── import-form-submissions.js  # 导入表单数据
│   │   └── view-data.js           # 查看数据库数据
│   └── index.js                   # 服务器入口
│
├── google-apps-script/    # Google Apps Script
│   └── Code.gs            # 表单提交触发器
│
├── docs/                  # 文档
├── uploads/               # 上传文件存储
├── docker-compose.yml     # Docker编排配置
├── Dockerfile             # 后端Docker镜像
└── package.json           # 后端依赖
```

## 文件说明

### 前端文件

#### `client/src/pages/index.tsx`
- **功能**: 首页路由重定向
- **逻辑**: 根据登录状态和角色重定向到对应页面

#### `client/src/pages/login.tsx`
- **功能**: 用户登录页面
- **逻辑**: 
  - 检测端口（3000=用户端，3001=管理端）
  - 邮箱/密码登录
  - 根据角色重定向

#### `client/src/pages/register.tsx`
- **功能**: 用户注册页面
- **逻辑**: 
  - 邮箱、密码、姓名注册
  - 自动登录并跳转

#### `client/src/pages/user/index.tsx`
- **功能**: 用户仪表板
- **功能模块**:
  - Virtual Run: 上传跑步数据（距离、时长、日期、图片、备注）
  - Quiz: 参加测验、查看历史记录
  - Google Form: 嵌入表单iframe
  - Edit Profile: 修改邮箱和密码

#### `client/src/pages/staff/index.tsx`
- **功能**: 管理仪表板
- **功能模块**:
  - Virtual Runs: 查看所有用户跑步数据
  - Form Submissions: 查看表单提交
  - Quiz Attempts: 查看测验结果（含图表）
  - Manage Quizzes: 创建/编辑/删除测验
  - Google Form Config: 配置表单URL
  - Users: 查看用户列表、修改用户角色（仅staff可操作， manager不可操作）

#### `client/src/utils/api.ts`
- **功能**: Axios实例封装
- **逻辑**: 统一API请求配置、Token注入、错误处理

### 后端文件

#### `server/index.js`
- **功能**: Express服务器入口
- **逻辑**: 
  - 初始化Express应用
  - 配置中间件（CORS、Body Parser）
  - 注册所有路由
  - 连接数据库并启动服务

#### `server/config/database.js`
- **功能**: 数据库连接和表初始化
- **表结构**:
  - `users`: 用户表（id, email, password, name, role, created_at）
  - `virtual_runs`: 虚拟跑步表
  - `quiz_attempts`: 测验记录表
  - `quizzes`: 测验题目表
  - `form_submissions`: 表单提交表
  - `form_config`: 表单配置表

#### `server/middleware/auth.js`
- **功能**: 认证中间件
- **函数**:
  - `authenticate`: 验证JWT Token
  - `requireStaff`: 要求staff或manager角色

#### `server/routes/auth.js`
- **功能**: 用户认证API
- **端点**:
  - `POST /api/auth/register`: 用户注册
  - `POST /api/auth/login`: 用户登录
  - `PUT /api/auth/update-profile`: 更新用户信息（邮箱/密码）

#### `server/routes/staff.js`
- **功能**: 管理端API
- **端点**:
  - `GET /api/staff/virtual-runs`: 获取所有跑步数据
  - `GET /api/staff/users`: 获取所有用户
  - `PUT /api/staff/users/:id/role`: 更新用户角色（仅staff可操作）

#### `server/routes/virtualRun.js`
- **功能**: 虚拟跑步API
- **端点**:
  - `POST /api/virtual-run/upload`: 上传跑步数据
  - `GET /api/virtual-run/my-runs`: 获取当前用户的跑步记录

#### `server/routes/quiz.js`
- **功能**: 测验API
- **端点**:
  - `GET /api/quiz/questions`: 获取所有测验
  - `POST /api/quiz/submit`: 提交测验答案
  - `GET /api/quiz/my-attempts`: 获取当前用户的测验记录
  - `GET /api/quiz/all-attempts`: 获取所有用户的测验记录
  - `POST /api/quiz/create`: 创建测验
  - `POST /api/quiz/create-default`: 创建默认测验
  - `PUT /api/quiz/update/:id`: 更新测验
  - `DELETE /api/quiz/delete/:id`: 删除测验

#### `server/routes/form.js`
- **功能**: 表单提交API
- **端点**:
  - `POST /api/form/submit`: 提交表单数据
  - `GET /api/form/submissions`: 获取所有表单提交

#### `server/routes/formConfig.js`
- **功能**: 表单配置API
- **端点**:
  - `GET /api/form-config/url`: 获取表单URL（用户）
  - `GET /api/form-config/config`: 获取配置（staff）
  - `POST /api/form-config/config`: 创建配置（staff）
  - `PUT /api/form-config/config`: 更新配置（staff）

#### `server/scripts/create-test-users.js`
- **功能**: 创建测试用户
- **逻辑**: 系统启动时自动创建 `staff@test.com` 和 `user@test.com`

## 快速开始

### 前置要求

- Docker 和 Docker Compose
- 或 Node.js 18+ 和 PostgreSQL 15

### 使用Docker（推荐）

1. **克隆项目**
```bash
cd Recruitment_Evaluation_System
```

2. **启动所有服务（包括 Tunnelmole）**
```bash
./start.sh
```

或者使用 Docker Compose 直接启动：

```bash
docker-compose up -d
docker-compose --profile tunnelmole up -d tunnelmole
```

3. **查看服务状态**
```bash
docker-compose ps
```

4. **查看日志**
```bash
docker-compose logs -f
```

5. **停止服务**
```bash
docker-compose down
```

### 手动启动

1. **安装依赖**
```bash
# 后端
npm install

# 前端
cd client
npm install
```

2. **配置数据库**
```bash
# 创建PostgreSQL数据库
createdb recruitment_db

# 或使用Docker启动PostgreSQL
docker run -d \
  --name postgres \
  -e POSTGRES_DB=recruitment_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:15
```

3. **配置环境变量（仅手动启动时需要）**
如果使用 Docker，环境变量已在 `docker-compose.yml` 中配置，无需 `.env` 文件。

如果手动启动（不使用 Docker），创建 `.env` 文件：
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=recruitment_db
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
PORT=5000
```

4. **初始化数据库**
```bash
node server/scripts/create-test-users.js
```

5. **启动后端**
```bash
npm run dev:server
```

6. **启动前端**
```bash
cd client
npm run dev
```

## 测试指南

### 访问地址

- **用户端**: http://localhost:3000
- **管理端**: http://localhost:3001
- **后端API**: http://localhost:5000/api

### 测试账户

#### Staff账户（管理员）
- **邮箱**: `staff@test.com`
- **密码**: `password123`
- **访问**: http://localhost:3001
- **权限**: 
  - 查看所有用户数据
  - 管理测验题目
  - 修改用户角色（仅staff@test.com可操作）

#### User账户（普通用户）
- **邮箱**: `user@test.com`
- **密码**: `password123`
- **访问**: http://localhost:3000
- **权限**: 
  - 上传虚拟跑步数据
  - 参加测验
  - 填写表单
  - 修改个人信息

### 测试流程

#### 1. 测试用户注册
1. 访问 http://localhost:3000
2. 点击 "Sign up with email"
3. 填写注册信息
4. 注册成功后自动登录

#### 2. 测试虚拟跑步上传
1. 登录用户端
2. 进入 "Virtual Run" 标签
3. 上传图片、填写距离、时长、日期、备注
4. 点击 "Upload"
5. 在管理端查看上传的数据

#### 3. 测试测验功能
1. 在管理端创建测验（Manage Quizzes）
2. 在用户端参加测验
3. 提交答案
4. 在管理端查看结果和图表

#### 4. 测试角色管理
1. 使用 `staff@test.com` 登录管理端
2. 进入 "Users" 标签
3. 修改用户角色（user ↔ manager）
4. 使用manager账户登录管理端测试

#### 5. 测试表单配置和同步
1. **获取 Tunnelmole URL（系统启动时已自动启动）**
   ```bash
   # 获取 HTTPS URL（推荐使用）
   docker-compose logs tunnelmole | grep 'https://'
   # 或实时查看所有日志
   docker-compose logs -f tunnelmole
   ```
   **注意**：使用 HTTPS URL（以 `https://` 开头），不要使用 HTTP URL。

2. **确保 Google Form 包含邮箱字段**
   - **必须**：Google Form 中必须包含一个邮箱字段
   - 问题标题必须包含 "email" 或 "e-mail"（不区分大小写）
   - 例如："Your Email"、"Email Address"、"E-mail" 等
   - 用户提交表单时，必须填写他们在系统中注册时使用的邮箱地址

3. **创建并配置 Google Apps Script 项目**
   - 详细步骤请参考：[Google Apps Script 完整指南](docs/GOOGLE_APPS_SCRIPT_COMPLETE_GUIDE.md)
   - 快速步骤：
     - 打开 `google-apps-script/Code.gs`，复制代码到 Google Apps Script 编辑器
     - 更新 `CONFIG.API_URL` 为：`https://xxxxx.tunnelmole.net/api/form/submit`
     - 更新 `CONFIG.FORM_ID` 为你的表单 ID
     - 在 Google Apps Script 编辑器中运行 `setupTrigger()` 函数设置触发器

4. 在管理端进入 "Google Form Config"
5. 配置表单URL
6. 在用户端查看嵌入的表单
7. 提交 Google Form，验证数据是否同步到管理端

### 数据库查询

查看数据库数据：
```bash
# 进入PostgreSQL容器
docker-compose exec postgres psql -U postgres -d recruitment_db

# 或使用脚本
node server/scripts/view-data.js
```

常用SQL查询：
```sql
-- 查看所有用户
SELECT id, email, name, role, created_at FROM users;

-- 查看虚拟跑步数据
SELECT * FROM virtual_runs;

-- 查看测验记录
SELECT * FROM quiz_attempts;

-- 查看表单提交
SELECT * FROM form_submissions;
```

### Google Form 同步测试

1. **确保 Google Form 包含邮箱字段**
   - **必须**：Google Form 中必须包含一个邮箱字段
   - 问题标题必须包含 "email" 或 "e-mail"（不区分大小写）
   - 例如："Your Email"、"Email Address"、"E-mail" 等
   - 用户提交表单时，必须填写他们在系统中注册时使用的邮箱地址
   - **重要**：所有用户必须先注册（http://localhost:3000/register），然后才能提交表单

2. **获取 Tunnelmole URL（系统启动时已自动启动）**
   ```bash
   # 获取 HTTPS URL（推荐使用）
   docker-compose logs tunnelmole | grep 'https://'
   # 或实时查看所有日志
   docker-compose logs -f tunnelmole
   ```

3. **更新 Google Apps Script**
   - 打开 `google-apps-script/Code.gs`
   - 更新 `CONFIG.API_URL` 为：`https://xxxxx.tunnelmole.net/api/form/submit`
   - 在 Google Apps Script 编辑器中运行 `setupTrigger()` 函数

4. **测试连接**
   ```bash
   ./test-tunnelmole-connection.sh https://xxxxx.tunnelmole.net
   ```

5. **查看同步日志**
   ```bash
   # 后端日志
   docker-compose logs -f backend | grep -i form
   
   # Tunnelmole 日志
   docker-compose logs -f tunnelmole
   ```

更多详细信息请参考：
- [Google Apps Script 完整指南](docs/GOOGLE_APPS_SCRIPT_COMPLETE_GUIDE.md) - 包含完整的设置流程
- [Tunnelmole 设置指南](docs/TUNNELMOLE_SETUP.md) - Tunnelmole 详细配置

## 角色权限说明

### user（普通用户）
- 访问用户端（端口3000）
- 上传虚拟跑步数据
- 参加测验
- 填写表单
- 修改个人信息

### manager（管理员）
- 访问管理端（端口3001）
- 查看所有用户数据
- 管理测验题目
- 配置表单URL
- **不能**修改用户角色

### staff（超级管理员）
- 访问管理端（端口3001）
- 所有manager权限
- **可以**修改用户角色
- `staff@test.com` 的role不能被修改

## 常见问题

### 端口被占用
如果端口3000、3001或5000被占用，修改 `docker-compose.yml` 中的端口映射。

### 数据库连接失败
检查PostgreSQL容器是否正常运行：
```bash
docker-compose ps
docker-compose logs postgres
```

### 前端无法连接后端
检查 `NEXT_PUBLIC_API_URL` 环境变量是否正确设置为 `http://localhost:5000/api`。

## 开发说明

### 添加新功能
1. 后端：在 `server/routes/` 添加新路由
2. 前端：在 `client/src/pages/` 添加新页面
3. 数据库：在 `server/config/database.js` 添加新表

### 代码规范
- 后端：使用 CommonJS (require/module.exports)
- 前端：使用 TypeScript 和 React Hooks
- API：RESTful风格，使用JWT认证

## 许可证

MIT License

