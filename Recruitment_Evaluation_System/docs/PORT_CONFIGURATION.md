# 端口配置说明

## 服务端口分配

系统现在使用不同的端口来区分 Staff 和 User 访问：

### 用户端口 (User Portal)
- **端口**: `3000`
- **访问地址**: `http://localhost:3000`
- **用途**: 普通用户访问
- **功能**:
  - 上传 Virtual Run 数据
  - 参加 Quiz 练习
  - 填写 Google Form
  - 查看自己的答题记录

### 管理员端口 (Staff Portal)
- **端口**: `3001`
- **访问地址**: `http://localhost:3001`
- **用途**: 管理员/Staff 访问
- **功能**:
  - 查看所有用户的 Virtual Run 数据
  - 查看所有用户的 Quiz 答题记录
  - 查看 Google Form 提交结果
  - 管理 Quiz 题目
  - 配置 Google Form URL
  - 查看所有用户列表

### 后端 API
- **端口**: `5000`
- **访问地址**: `http://localhost:5000/api`
- **用途**: 后端 API 服务（两个前端共享）

### 数据库
- **端口**: `5432`
- **访问地址**: `localhost:5432`
- **用途**: PostgreSQL 数据库

## 访问控制

### 自动端口验证
- 在 **端口 3000** (User Portal) 登录时：
  - ✅ 普通用户 (role: 'user') 可以正常访问
  - ❌ Staff 用户会被提示使用 Staff Portal (端口 3001)

- 在 **端口 3001** (Staff Portal) 登录时：
  - ✅ Staff 用户 (role: 'staff') 可以正常访问
  - ❌ 普通用户会被提示使用 User Portal (端口 3000)

### 登录页面
- 登录页面会根据当前端口显示不同的标题：
  - 端口 3000: "User Login"
  - 端口 3001: "Staff Login"

## 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 测试账户

### Staff 账户
- **邮箱**: `staff@test.com`
- **密码**: `password123`
- **访问**: `http://localhost:3001`

### User 账户
- **邮箱**: `user@test.com`
- **密码**: `password123`
- **访问**: `http://localhost:3000`

## 注意事项

1. **端口冲突**: 如果端口 3000 或 3001 已被占用，需要：
   - 停止占用端口的服务
   - 或修改 `docker-compose.yml` 中的端口映射

2. **数据共享**: 两个前端服务共享同一个后端 API 和数据库，所以数据是同步的

3. **开发环境**: 在开发环境中，两个服务都使用相同的代码库，只是运行在不同的端口

4. **生产环境**: 在生产环境中，可以考虑：
   - 使用不同的域名（如 `staff.example.com` 和 `user.example.com`）
   - 使用反向代理（如 Nginx）来路由请求
   - 部署到不同的服务器

## 故障排查

### 端口被占用
```bash
# 检查端口占用
lsof -i :3000
lsof -i :3001

# 停止占用端口的进程
kill -9 <PID>
```

### 服务无法启动
```bash
# 查看服务日志
docker-compose logs frontend-user
docker-compose logs frontend-staff
docker-compose logs backend

# 重启服务
docker-compose restart frontend-user frontend-staff
```

### 无法访问
1. 检查 Docker 容器是否运行：`docker-compose ps`
2. 检查端口映射是否正确
3. 检查防火墙设置
4. 尝试访问 `http://localhost:3000` 和 `http://localhost:3001`

