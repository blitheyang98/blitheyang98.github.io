# 部署指南

本指南说明如何将 Recruitment Evaluation System 部署为：前端在 GitHub Pages，后端和数据库在本地 Docker。

## 架构概览

```
GitHub Pages (静态前端)
    ↓ HTTPS 请求
Tunnelmole (公网隧道)
    ↓
本地 Docker 后端 (localhost:5001)
    ↓
PostgreSQL 数据库 (Docker)
```

## 前置要求

- Docker 和 Docker Compose
- GitHub 账户
- 本地机器需要保持在线（用于运行后端）

## 步骤 1: 本地启动后端和数据库

### 1.1 启动 Docker 服务

```bash
cd Recruitment_Evaluation_System

# 启动数据库和后端
docker-compose up -d postgres backend

# 等待服务就绪
sleep 15

# 启动 Tunnelmole（在主机上运行，将本地后端暴露到公网）
# 方法 1: 使用启动脚本（推荐）
./start-tunnelmole.sh

# 方法 2: 手动运行
npx -y tunnelmole 5001
```

或者使用启动脚本(该脚本会同时启动localhost frontend)：

```bash
./start.sh
```

### 1.2 获取 Tunnelmole URL

Tunnelmole 启动后，会在终端显示公网 URL。你会看到类似这样的输出：
```
https://xxxxx-ip-xxx-xxx-xxx-xxx.tunnelmole.net ⟶   http://localhost:5001
http://xxxxx-ip-xxx-xxx-xxx-xxx.tunnelmole.net ⟶   http://localhost:5001
```

**重要**: 
- 复制完整的 HTTPS URL（例如：`https://xxxxx.tunnelmole.net`）
- Tunnelmole 直接连接到后端端口 5001（无需 proxy）
- Tunnelmole 需要在主机上持续运行，不要关闭终端窗口
- 如果需要后台运行，可以使用：`nohup npx -y tunnelmole 5001 > tunnelmole.log 2>&1 &`

### 1.3 验证后端可访问

**方法 1：测试本地后端（推荐）**

```bash
curl http://localhost:5001/api/health
```

如果返回 `{"status":"ok","message":"Server is running"}`，说明后端正常运行。

**方法 2：测试 Tunnelmole 公网 URL**

```bash
curl https://xxxxx.tunnelmole.net/api/health
```

如果返回 `{"status":"ok","message":"Server is running"}`，说明后端已成功暴露到公网。

**注意**：
- 如果 Tunnelmole 连接超时，可能是网络问题，但本地后端正常即可继续
- 如果返回 404，检查后端是否已重启以加载新的 health 端点
- 如果连接错误，检查：
  - Tunnelmole 进程是否运行：`ps aux | grep tunnelmole`
  - 后端容器是否运行：`docker-compose ps backend`
  - 查看后端日志：`docker-compose logs backend`
  - 测试后端直接连接：`curl http://localhost:5001/api/health`

## 步骤 2: 配置 GitHub Pages

### 2.0 选择仓库类型

**两种方式都可以：**

**方式 A: 使用 `username.github.io` 仓库（根域名）**
- 仓库名必须是：`你的用户名.github.io`
- 如果代码在根目录：访问地址 `https://你的用户名.github.io`，不需要设置 `basePath`
- 如果代码在子目录（如 `Recruitment_Evaluation_System/`）：访问地址 `https://你的用户名.github.io/Recruitment_Evaluation_System`，需要设置 `basePath: '/Recruitment_Evaluation_System'`
- 优点：URL 简洁

**创建 `username.github.io` 仓库步骤：**
1. 登录 GitHub，点击右上角 "+" > "New repository"
2. 仓库名输入：`你的用户名.github.io`（例如：`blitheyang98.github.io`）
   - **重要**：必须完全匹配你的用户名，包括大小写
3. 选择 "Public"（公开）
4. **不要**勾选 "Add a README file"（我们会上传现有代码）
5. 点击 "Create repository"
6. 创建后，GitHub 会自动识别这是一个 Pages 仓库

**方式 B: 使用任意公开仓库（子路径）**
- 仓库名可以是任意名称，如 `Recruitment_Evaluation_System`
- 访问地址：`https://你的用户名.github.io/Recruitment_Evaluation_System`
- 优点：一个账户可以部署多个项目
- 配置：需要在 `client/next.config.js` 中设置 `basePath: '/仓库名'`

**推荐**：如果这是你的主要项目，使用方式 A；如果想保留账户名用于其他项目，使用方式 B。

### 2.1 上传项目代码

**重要**：
- **只需要上传前端代码**（`Recruitment_Evaluation_System/client/` 目录）
- **不需要上传** server、backend、数据库等后端代码
- GitHub Pages 只用于静态前端，后端在本地 Docker 运行

上传步骤：

1. 在 `blitheyang98.github.io` 仓库根目录初始化 git（如果还没有）：
   ```bash
   cd /Users/blithe/Downloads/blitheyang98.github.io
   git init
   ```

2. 只添加前端代码目录：
   ```bash
   git add Recruitment_Evaluation_System/client/
   git add Recruitment_Evaluation_System/.github/  # 如果需要工作流文件
   git commit -m "Add frontend code"
   ```

3. 添加远程仓库并推送：
   ```bash
   git remote add origin https://github.com/blitheyang98/blitheyang98.github.io.git
   git branch -M main
   git push -u origin main
   ```

   **如果遇到权限错误**（例如：`Permission denied to yx018`）：
   - 说明当前 git 使用的是其他账户的凭据
   - 解决方法 1：清除缓存的凭据，使用正确的账户：
     ```bash
     # macOS
     git credential-osxkeychain erase
     host=github.com
     protocol=https
     # 按两次回车
     
     # 然后重新推送，会提示输入用户名和密码（或 token）
     git push -u origin main
     ```
   - 解决方法 2：使用 SSH（推荐）：
     ```bash
     # 将 remote URL 改为 SSH
     git remote set-url origin git@github.com:blitheyang98/blitheyang98.github.io.git
     git push -u origin main
     ```
   - 解决方法 3：使用 Personal Access Token：
     ```bash
     # 在推送时，用户名输入 blitheyang98，密码输入 GitHub Personal Access Token
     git push -u origin main
     ```

**注意**：如果仓库中已经有其他内容，确保 `Recruitment_Evaluation_System/client/` 目录结构正确。

### 2.2 启用 GitHub Pages

#### 情况 A: 仓库是公开的

1. 打开你的 GitHub 仓库页面
2. 点击仓库顶部的 **Settings**（设置）标签
3. 在左侧边栏中找到并点击 **Pages**（页面）
4. 在 "Source"（源）部分，选择 **GitHub Actions**（不是 "Deploy from a branch"）
5. 在建议的工作流列表中，点击 **Next.js** 工作流的 **Configure** 按钮
6. GitHub 会打开编辑器显示生成的 `nextjs.yml` 工作流文件
7. **重要**：由于项目代码在 `Recruitment_Evaluation_System/client/` 目录下，需要修改工作流：
   - 修改 "Detect package manager" 步骤，检查 `Recruitment_Evaluation_System/client/` 目录：
     ```yaml
     - name: Detect package manager
       id: detect-package-manager
       run: |
         if [ -f "${{ github.workspace }}/Recruitment_Evaluation_System/client/yarn.lock" ]; then
           echo "manager=yarn" >> $GITHUB_OUTPUT
           echo "command=install" >> $GITHUB_OUTPUT
           echo "runner=yarn" >> $GITHUB_OUTPUT
           exit 0
         elif [ -f "${{ github.workspace }}/Recruitment_Evaluation_System/client/package.json" ]; then
           echo "manager=npm" >> $GITHUB_OUTPUT
           echo "command=ci" >> $GITHUB_OUTPUT
           echo "runner=npx --no-install" >> $GITHUB_OUTPUT
           exit 0
         else
           echo "Unable to determine package manager"
           exit 1
         fi
     ```
   - 修改 "Setup Node" 步骤，添加 cache-dependency-path：
     ```yaml
     - name: Setup Node
       uses: actions/setup-node@v4
       with:
         node-version: "20"
         cache: ${{ steps.detect-package-manager.outputs.manager }}
         cache-dependency-path: Recruitment_Evaluation_System/client/package-lock.json
     ```
   - 修改 "Restore cache" 步骤的路径：
     ```yaml
     - name: Restore cache
       uses: actions/cache@v4
       with:
         path: |
           Recruitment_Evaluation_System/client/.next/cache
         key: ${{ runner.os }}-nextjs-${{ hashFiles('Recruitment_Evaluation_System/client/**/package-lock.json') }}-${{ hashFiles('Recruitment_Evaluation_System/client/**.[jt]s', 'Recruitment_Evaluation_System/client/**.[jt]sx') }}
         restore-keys: |
           ${{ runner.os }}-nextjs-${{ hashFiles('Recruitment_Evaluation_System/client/**/package-lock.json') }}-
     ```
   - 在 "Install dependencies" 步骤添加 working-directory：
     ```yaml
     - name: Install dependencies
       working-directory: ./Recruitment_Evaluation_System/client
       run: ${{ steps.detect-package-manager.outputs.manager }} ${{ steps.detect-package-manager.outputs.command }}
     ```
   - 在 "Build with Next.js" 步骤添加 working-directory 和环境变量：
     ```yaml
     - name: Build with Next.js
       working-directory: ./Recruitment_Evaluation_System/client
       env:
         NEXT_PUBLIC_API_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
         NEXT_PUBLIC_GOOGLE_FORM_URL: ${{ secrets.NEXT_PUBLIC_GOOGLE_FORM_URL }}
       run: ${{ steps.detect-package-manager.outputs.runner }} next build
     ```
   - 修改 "Upload artifact" 步骤的 path：
     ```yaml
     - name: Upload artifact
       uses: actions/upload-pages-artifact@v3
       with:
         path: ./Recruitment_Evaluation_System/client/out
     ```
   - **注意**：Deployment job 部分不需要修改，`actions/deploy-pages@v4` 会自动从 build job 上传的 artifact 中获取文件
8. 点击页面右上角的 **Commit changes...** 按钮提交工作流文件
9. 提交后，工作流文件会创建在 `.github/workflows/nextjs.yml`
10. **重要**：在触发工作流之前，必须先完成步骤 2.3 配置 GitHub Secrets，否则构建会失败
11. 进入仓库的 **Actions** 标签，查看工作流运行状态
12. 如果工作流失败，点击失败的运行查看详细错误信息：
    - 如果提示找不到 `Recruitment_Evaluation_System/client/package.json`，检查代码是否正确上传
    - 如果提示环境变量未定义，检查是否配置了 GitHub Secrets
    - 如果提示构建错误，检查 Next.js 配置是否正确
13. 等待工作流完成（首次运行可能需要几分钟）
14. 工作流成功后，返回 **Settings > Pages**，应该能看到部署信息

#### 情况 B: 仓库是私有的（看到 "Upgrade or make this repository public"）

私有仓库使用 GitHub Pages 需要 **GitHub Pro**（$4/月）或更高版本。

**解决方案选项：**

**选项 1: 将仓库设为公开（推荐，免费）**
1. 进入仓库 Settings > General
2. 滚动到底部 "Danger Zone"
3. 点击 "Change visibility" > "Change to public"
4. 确认后，返回 Pages 设置即可看到 Source 选项

**选项 2: 升级到 GitHub Pro**
- 访问 GitHub 账户设置
- 升级到 GitHub Pro（$4/月）
- 升级后即可在私有仓库使用 GitHub Pages

**选项 3: 使用其他免费托管服务（无需升级）**
如果不想公开仓库或升级，可以使用：
- **Vercel**（推荐）：支持私有仓库，自动部署，完全免费
- **Netlify**：支持私有仓库，免费套餐可用
- **Cloudflare Pages**：支持私有仓库，免费

**注意**：
- 首次设置可能需要几分钟才能生效
- 如果选择其他托管服务，需要修改部署工作流配置

### 2.3 配置 GitHub Secrets

在仓库设置中添加以下 Secrets：

1. 进入 Settings > Secrets and variables > Actions
2. 点击 "New repository secret"
3. 添加以下 secret：

**NEXT_PUBLIC_API_URL**
- Name: `NEXT_PUBLIC_API_URL`
- Value: `https://xxxxx.tunnelmole.net/api`（使用步骤 1.2 中获取的 URL，加上 `/api` 后缀）
- **说明**：`/api` 是后端 API 的基础路径，包含以下端点：
  - `/api/auth` - 用户认证（登录、注册）
  - `/api/user` - 用户相关接口
  - `/api/staff` - 员工相关接口
  - `/api/quiz` - 测试题相关接口
  - `/api/form` - 表单提交接口
  - `/api/form-config` - 表单配置接口
  - `/api/virtual-run` - 虚拟跑步相关接口
  - `/uploads` - 静态文件（图片等）
  - Google Form URL 由员工在后台配置，存储在数据库中
  - 前端通过 API `/form-config/url` 从后端动态获取
- **重要**：Tunnelmole 每次重启可能生成新的 URL，如果 URL 变化，需要更新此 Secret 并重新触发部署（见步骤 2.3）

### 2.4 触发部署

**方法 1：手动触发（推荐，无需提交代码）**

1. 进入仓库的 **Actions** 标签
2. 在左侧工作流列表中选择 **"Deploy Next.js site to Pages"**
3. 点击右侧的 **"Run workflow"** 按钮
4. 选择分支（通常是 `main`）
5. 点击 **"Run workflow"** 确认

**方法 2：推送代码触发**

推送代码到 main 分支：

```bash
git add .
git commit -m "Deploy to GitHub Pages"
git push origin main
```

或者推送空提交（如果代码没有变化）：

```bash
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

GitHub Actions 会自动：
1. 构建 Next.js 静态文件
2. 部署到 GitHub Pages

### 2.5 查看部署状态

1. 进入仓库的 "Actions" 标签
2. 查看 "Deploy to GitHub Pages" 工作流状态
3. 等待部署完成

部署完成后：
- 如果使用 `username.github.io` 仓库且代码在根目录：网站将在 `https://yourusername.github.io` 可用
- 如果使用 `username.github.io` 仓库但代码在子目录（如 `Recruitment_Evaluation_System/`）：网站将在 `https://yourusername.github.io/Recruitment_Evaluation_System` 可用
- 如果使用其他仓库名：网站将在 `https://yourusername.github.io/your-repo-name` 可用

**重要**：
- 如果代码在子目录下，需要在 `client/next.config.js` 中设置 `basePath: '/子目录名'`（例如：`basePath: '/Recruitment_Evaluation_System'`）
- 如果使用非 `username.github.io` 的仓库，也需要设置 `basePath: '/仓库名'`
- 修改 `basePath` 后需要重新构建和部署

## 步骤 3: 更新 Tunnelmole URL

如果 Tunnelmole URL 发生变化（每次重启可能不同），需要更新：

### 3.1 获取新 URL

如果 Tunnelmole 正在运行，查看终端输出。或者重新启动 Tunnelmole：
```bash
npx -y tunnelmole 5001
```

### 3.2 更新 GitHub Secrets

1. 进入仓库 Settings > Secrets and variables > Actions
2. 找到 `NEXT_PUBLIC_API_URL`
3. 点击 "Update"
4. 输入新的 URL（格式：`https://xxxxx.tunnelmole.net/api`）
5. 保存

### 3.3 重新部署

更新 Secret 后，需要重新触发部署：

```bash
# 方法 1: 推送空提交
git commit --allow-empty -m "Trigger redeploy"
git push

# 方法 2: 在 GitHub Actions 页面手动触发工作流
```

## 步骤 4: 配置后端 CORS

后端已配置允许以下域名：
- `*.github.io` (GitHub Pages)
- `*.tunnelmole.net` (Tunnelmole)
- `localhost` 和 `127.0.0.1` (本地开发)

如果需要添加其他域名，编辑 `server/index.js` 中的 CORS 配置。

## 访问应用

### 用户入口
- GitHub Pages: `https://yourusername.github.io/your-repo-name/`
- 本地开发: `http://localhost:3000`

### 员工入口
- GitHub Pages: `https://yourusername.github.io/your-repo-name/?portal=staff`
- 本地开发: `http://localhost:3001`

## 测试账户

- Staff: `staff@test.com` / `password123`
- User: `user@test.com` / `password123`

## 常见问题

### 1. Tunnelmole URL 每次启动都变化

这是正常的。Tunnelmole 是免费服务，每次启动可能生成不同的 URL。解决方案：
- 每次启动后更新 GitHub Secrets
- 考虑使用付费的 ngrok 或其他隧道服务（支持固定域名）

### 2. CORS 错误

确保：
- 后端 CORS 配置包含你的 GitHub Pages 域名
- Tunnelmole URL 正确配置在 GitHub Secrets 中

### 3. 前端无法连接后端

检查：
- Tunnelmole 进程是否运行：`ps aux | grep tunnelmole`
- 后端容器是否运行：`docker-compose ps backend`
- 测试后端直接连接：`curl http://localhost:5001/api/health`
- Tunnelmole URL 是否正确（查看运行 Tunnelmole 的终端输出）
- GitHub Secrets 中的 URL 是否正确（包含 `/api` 后缀）

### 4. 图片无法显示

确保图片 URL 使用正确的 API base URL。代码已自动处理，但需要确保 `NEXT_PUBLIC_API_URL` 正确设置。

## 维护

### 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f tunnelmole
```

### 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止 Tunnelmole（在运行 Tunnelmole 的终端按 Ctrl+C）
# 或者查找并终止进程：
pkill -f tunnelmole
```

### 重启服务

```bash
docker-compose restart backend
# 重启 Tunnelmole（先停止，然后重新运行）
pkill -f tunnelmole
npx -y tunnelmole 5001
```

## 安全注意事项

1. **JWT Secret**: 生产环境应使用强随机密钥
2. **数据库密码**: 不要使用默认密码
3. **Tunnelmole**: 免费服务可能有速率限制，生产环境考虑使用付费服务
4. **HTTPS**: 确保使用 Tunnelmole 的 HTTPS URL（不是 HTTP）

## 备选方案

如果 Tunnelmole 不稳定，可以考虑：

1. **ngrok**: 支持固定域名（付费）
2. **Cloudflare Tunnel**: 免费，支持固定域名
3. **localtunnel**: 免费替代方案
4. **自建 VPN**: 如果有多台服务器

