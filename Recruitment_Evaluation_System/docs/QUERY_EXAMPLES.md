# PostgreSQL 数据查询示例

本文档提供了多种查询数据库的方法和常用 SQL 查询命令。

## 方法1: 使用 Docker 命令直接查询

### 基础查询

#### 查看所有表
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c '\dt'
```

#### 查看表结构
```bash
# 查看 users 表结构
docker-compose exec postgres psql -U postgres -d recruitment_db -c '\d users'

# 查看所有表结构
docker-compose exec postgres psql -U postgres -d recruitment_db -c '\d+'
```

### 用户表 (users) 查询

#### 查看所有用户
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT * FROM users ORDER BY id;'
```

#### 查看用户基本信息
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC;'
```

#### 按角色查看用户
```bash
# 查看所有 staff 用户
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT id, email, name, role FROM users WHERE role = 'staff';"

# 查看所有 manager 用户
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT id, email, name, role FROM users WHERE role = 'manager';"

# 查看所有普通用户
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT id, email, name, role FROM users WHERE role = 'user';"
```

#### 查看用户统计
```bash
# 按角色统计用户数量
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT role, COUNT(*) as count FROM users GROUP BY role;"

# 查看最近注册的用户
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC LIMIT 10;"
```

#### 查看用户认证信息
```bash
# 查看已设置密码的用户
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT id, email, name, password_set, google_id IS NOT NULL as has_google FROM users;"
```

### 虚拟跑步表 (virtual_runs) 查询

#### 查看所有跑步记录
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT vr.*, u.name as user_name, u.email FROM virtual_runs vr JOIN users u ON vr.user_id = u.id ORDER BY vr.created_at DESC;'
```

#### 查看跑步记录摘要
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT vr.id, vr.distance, vr.duration, vr.date, u.name as user_name, vr.created_at FROM virtual_runs vr JOIN users u ON vr.user_id = u.id ORDER BY vr.date DESC LIMIT 20;'
```

#### 查看特定用户的跑步记录
```bash
# 替换 user@example.com 为实际邮箱
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT vr.* FROM virtual_runs vr JOIN users u ON vr.user_id = u.id WHERE u.email = 'user@example.com' ORDER BY vr.date DESC;"
```

#### 跑步统计查询
```bash
# 按用户统计跑步总距离
docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT u.name, u.email, COUNT(vr.id) as run_count, SUM(vr.distance) as total_distance, SUM(vr.duration) as total_duration FROM virtual_runs vr JOIN users u ON vr.user_id = u.id GROUP BY u.id, u.name, u.email ORDER BY total_distance DESC;'

# 查看最近7天的跑步记录
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT vr.*, u.name as user_name FROM virtual_runs vr JOIN users u ON vr.user_id = u.id WHERE vr.date >= CURRENT_DATE - INTERVAL '7 days' ORDER BY vr.date DESC;"
```

### 测验表 (quizzes) 查询

#### 查看所有测验
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT id, title, created_at, updated_at FROM quizzes ORDER BY id;'
```

#### 查看测验详情（包含问题）
```bash
# 查看测验 ID 和标题
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT id, title, created_at FROM quizzes;"

# 查看完整测验内容（JSONB 格式）
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT id, title, questions FROM quizzes;"

# 格式化显示 JSONB 内容
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT id, title, questions::text FROM quizzes;"
```

#### 查看测验问题数量
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT id, title, jsonb_array_length(questions) as question_count FROM quizzes;"
```

### 测验记录表 (quiz_attempts) 查询

#### 查看所有答题记录
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT qa.id, qa.quiz_id, qa.score, u.name as user_name, u.email, qa.completed_at FROM quiz_attempts qa JOIN users u ON qa.user_id = u.id ORDER BY qa.completed_at DESC;'
```

#### 查看答题记录详情（包含答案）
```bash
# 查看答案（JSONB 格式）
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT qa.id, qa.quiz_id, qa.score, u.name as user_name, qa.answers::text, qa.completed_at FROM quiz_attempts qa JOIN users u ON qa.user_id = u.id ORDER BY qa.completed_at DESC LIMIT 10;"
```

#### 查看特定用户的答题记录
```bash
# 替换 user@example.com 为实际邮箱
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT qa.*, q.title as quiz_title FROM quiz_attempts qa JOIN users u ON qa.user_id = u.id JOIN quizzes q ON qa.quiz_id = q.id WHERE u.email = 'user@example.com' ORDER BY qa.completed_at DESC;"
```

#### 查看特定测验的所有答题记录
```bash
# 替换 1 为实际测验 ID
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT qa.id, qa.score, u.name as user_name, u.email, qa.completed_at FROM quiz_attempts qa JOIN users u ON qa.user_id = u.id WHERE qa.quiz_id = 1 ORDER BY qa.score DESC, qa.completed_at DESC;"
```

#### 测验统计查询
```bash
# 按测验统计答题情况
docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT q.id, q.title, COUNT(qa.id) as attempt_count, AVG(qa.score) as avg_score, MAX(qa.score) as max_score, MIN(qa.score) as min_score FROM quizzes q LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id GROUP BY q.id, q.title ORDER BY q.id;'

# 按用户统计答题情况
docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT u.id, u.name, u.email, COUNT(qa.id) as attempt_count, AVG(qa.score) as avg_score FROM users u LEFT JOIN quiz_attempts qa ON u.id = qa.user_id GROUP BY u.id, u.name, u.email ORDER BY attempt_count DESC;'
```

### 表单提交表 (form_submissions) 查询

#### 查看所有表单提交
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT fs.id, fs.user_id, fs.google_form_id, u.name as user_name, u.email, fs.submitted_at FROM form_submissions fs JOIN users u ON fs.user_id = u.id ORDER BY fs.submitted_at DESC;"
```

#### 查看表单提交详情（包含提交数据）
```bash
# 查看提交数据（JSONB 格式）
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT fs.id, fs.google_form_id, u.name as user_name, fs.submission_data::text, fs.submitted_at FROM form_submissions fs JOIN users u ON fs.user_id = u.id ORDER BY fs.submitted_at DESC LIMIT 10;"
```

#### 查看特定用户的表单提交
```bash
# 替换 user@example.com 为实际邮箱
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT fs.*, u.name as user_name FROM form_submissions fs JOIN users u ON fs.user_id = u.id WHERE u.email = 'user@example.com' ORDER BY fs.submitted_at DESC;"
```

#### 查看特定表单的所有提交
```bash
# 替换 form-id-123 为实际 Google Form ID
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT fs.id, fs.user_id, u.name as user_name, u.email, fs.submitted_at FROM form_submissions fs JOIN users u ON fs.user_id = u.id WHERE fs.google_form_id = 'form-id-123' ORDER BY fs.submitted_at DESC;"
```

#### 表单提交统计
```bash
# 按表单统计提交数量
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT google_form_id, COUNT(*) as submission_count FROM form_submissions GROUP BY google_form_id ORDER BY submission_count DESC;"

# 按用户统计提交数量
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT u.name, u.email, COUNT(fs.id) as submission_count FROM users u LEFT JOIN form_submissions fs ON u.id = fs.user_id GROUP BY u.id, u.name, u.email ORDER BY submission_count DESC;"

# 查看最近24小时的表单提交
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT fs.id, fs.google_form_id, u.name as user_name, fs.submitted_at FROM form_submissions fs JOIN users u ON fs.user_id = u.id WHERE fs.submitted_at >= NOW() - INTERVAL '24 hours' ORDER BY fs.submitted_at DESC;"
```

### 表单配置表 (form_config) 查询

#### 查看表单配置
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c 'SELECT * FROM form_config;'
```

#### 查看表单配置详情
```bash
docker-compose exec postgres psql -U postgres -d recruitment_db -c "SELECT fc.*, u.name as updated_by_name, u.email as updated_by_email FROM form_config fc LEFT JOIN users u ON fc.updated_by = u.id;"
```

## 方法2: 进入 PostgreSQL 交互式命令行

```bash
docker-compose exec postgres psql -U postgres -d recruitment_db
```

进入后可以执行 SQL 查询和命令：

### 常用 psql 命令
```sql
-- 查看所有表
\dt

-- 查看表结构
\d users
\d quizzes
\d virtual_runs
\d quiz_attempts
\d form_submissions
\d form_config

-- 查看表详细信息（包括索引、约束等）
\d+ users

-- 列出所有数据库
\l

-- 查看当前数据库
SELECT current_database();

-- 查看当前用户
SELECT current_user;

-- 退出
\q
```

### 在交互式命令行中执行查询
```sql
-- 查看所有用户
SELECT * FROM users ORDER BY id;

-- 查看最近创建的记录
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;

-- 查看特定用户的完整数据
SELECT * FROM users WHERE email = 'user@test.com';

-- 查看 JSONB 字段（格式化显示）
SELECT id, title, jsonb_pretty(questions) FROM quizzes WHERE id = 1;

-- 退出交互式命令行
\q
```

## 方法3: 使用 Node.js 脚本

### 查看数据概览
```bash
# 在 Docker 容器内执行
docker-compose exec backend node server/scripts/view-data.js

# 或使用提供的脚本（推荐）
./view-data.sh
```

这个脚本会显示所有主要表的数据摘要：
- Users: 所有用户信息
- Quizzes: 所有测验
- Quiz Attempts: 最近10条测验记录
- Virtual Runs: 最近10条跑步记录
- Form Submissions: 最近10条表单提交
- Form Config: 表单配置信息

### 其他可用脚本
```bash
# 创建测试用户
docker-compose exec backend node server/scripts/create-test-users.js

# 导入表单提交数据
docker-compose exec backend node server/scripts/import-form-submissions.js

# 初始化数据库连接
docker-compose exec backend node server/scripts/init-db.js
```

## 方法4: 使用图形化工具

可以使用以下工具连接数据库：
- **pgAdmin**: https://www.pgadmin.org/
- **DBeaver**: https://dbeaver.io/
- **TablePlus**: https://tableplus.com/
- **DataGrip**: https://www.jetbrains.com/datagrip/

### 连接信息
- **Host**: localhost
- **Port**: 5432
- **Database**: recruitment_db
- **User**: postgres
- **Password**: postgres

### 使用图形化工具的优势
- 可视化查看表结构和数据
- 方便编辑 JSONB 字段
- 支持数据导出和导入
- 提供查询构建器

---

## 高级查询示例

### JSONB 字段查询

#### 查询测验中的特定问题
```sql
-- 查看测验中第一个问题的内容
SELECT id, title, questions->0 as first_question 
FROM quizzes 
WHERE id = 1;

-- 查看测验问题的数量
SELECT id, title, jsonb_array_length(questions) as question_count 
FROM quizzes;

-- 查询包含特定关键词的问题
SELECT id, title, questions 
FROM quizzes 
WHERE questions::text LIKE '%关键词%';
```

#### 查询答题记录中的答案
```sql
-- 查看答题记录中的答案（格式化）
SELECT qa.id, u.name, q.title, qa.answers::text, qa.score 
FROM quiz_attempts qa 
JOIN users u ON qa.user_id = u.id 
JOIN quizzes q ON qa.quiz_id = q.id 
ORDER BY qa.completed_at DESC 
LIMIT 10;

-- 查询特定问题的答案
SELECT qa.id, u.name, qa.answers->'问题文本' as answer 
FROM quiz_attempts qa 
JOIN users u ON qa.user_id = u.id 
WHERE qa.quiz_id = 1;
```

#### 查询表单提交中的数据
```sql
-- 查看表单提交数据（格式化）
SELECT fs.id, u.name, fs.submission_data::text, fs.submitted_at 
FROM form_submissions fs 
JOIN users u ON fs.user_id = u.id 
ORDER BY fs.submitted_at DESC 
LIMIT 10;

-- 查询包含特定字段的表单提交
SELECT fs.id, u.name, fs.submission_data->'Email' as email, fs.submitted_at 
FROM form_submissions fs 
JOIN users u ON fs.user_id = u.id 
WHERE fs.submission_data ? 'Email';
```

### 统计和聚合查询

#### 用户活动统计
```sql
-- 用户完整活动统计
SELECT 
  u.id,
  u.name,
  u.email,
  COUNT(DISTINCT vr.id) as run_count,
  COUNT(DISTINCT qa.id) as quiz_count,
  COUNT(DISTINCT fs.id) as form_count,
  COALESCE(SUM(vr.distance), 0) as total_distance,
  COALESCE(AVG(qa.score), 0) as avg_quiz_score
FROM users u
LEFT JOIN virtual_runs vr ON u.id = vr.user_id
LEFT JOIN quiz_attempts qa ON u.id = qa.user_id
LEFT JOIN form_submissions fs ON u.id = fs.user_id
GROUP BY u.id, u.name, u.email
ORDER BY (run_count + quiz_count + form_count) DESC;
```

#### 日期范围查询
```sql
-- 查询最近7天的所有活动
SELECT 
  'Virtual Runs' as activity_type,
  COUNT(*) as count,
  MIN(created_at) as first_activity,
  MAX(created_at) as last_activity
FROM virtual_runs
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
  'Quiz Attempts' as activity_type,
  COUNT(*) as count,
  MIN(completed_at) as first_activity,
  MAX(completed_at) as last_activity
FROM quiz_attempts
WHERE completed_at >= CURRENT_DATE - INTERVAL '7 days'
UNION ALL
SELECT 
  'Form Submissions' as activity_type,
  COUNT(*) as count,
  MIN(submitted_at) as first_activity,
  MAX(submitted_at) as last_activity
FROM form_submissions
WHERE submitted_at >= CURRENT_DATE - INTERVAL '7 days';
```

### 数据导出查询

#### 导出为 CSV 格式
```bash
# 导出用户数据
docker-compose exec postgres psql -U postgres -d recruitment_db -c "COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER;" > users.csv

# 导出虚拟跑步数据
docker-compose exec postgres psql -U postgres -d recruitment_db -c "COPY (SELECT vr.*, u.email, u.name as user_name FROM virtual_runs vr JOIN users u ON vr.user_id = u.id) TO STDOUT WITH CSV HEADER;" > virtual_runs.csv
```

---

## 常用维护查询

### 数据清理
```sql
-- 删除测试数据（谨慎使用）
DELETE FROM virtual_runs WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
DELETE FROM quiz_attempts WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
DELETE FROM form_submissions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
```

### 数据备份查询
```sql
-- 查看表大小
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 性能优化查询
```sql
-- 查看表索引
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 分析表统计信息
ANALYZE users;
ANALYZE virtual_runs;
ANALYZE quiz_attempts;
ANALYZE form_submissions;
```

