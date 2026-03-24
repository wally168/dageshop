# AMZSHOP 部署指南

## 项目概述
AMZSHOP 是一个基于 Next.js 的现代化电商系统，使用 TypeScript、Prisma、SQLite 和 Tailwind CSS 构建。

## 技术栈
- **框架**: Next.js 16.0.0
- **语言**: TypeScript
- **数据库**: Prisma + SQLite (开发) / PostgreSQL (生产)
- **样式**: Tailwind CSS 4
- **UI组件**: Headless UI + Lucide React

## 部署到 GitHub

### 1. 初始化 Git 仓库
```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit: AMZSHOP e-commerce system"
```

### 2. 连接到 GitHub
```bash
# 创建新的 GitHub 仓库 (https://github.com/new)
# 然后连接到远程仓库
git remote add origin https://github.com/kongdecc/AMZSHOP.git
git branch -M main
git push -u origin main
```

## 部署到 Vercel

### 1. 准备部署
确保以下文件已正确配置：
- ✅ `vercel.json` - Vercel 配置文件
- ✅ `package.json` - 包含正确的构建脚本
- ✅ `.gitignore` - 忽略敏感文件和开发文件
- ✅ `.env.example` - 环境变量模板

### 2. 在 Vercel 上部署

#### 方法一: 通过 GitHub 集成 (推荐)
1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "New Project"
4. 导入你的 GitHub 仓库 `kongdecc/AMZSHOP`
5. 配置环境变量 (见下文)
6. 点击 "Deploy"

#### 方法二: 通过 Vercel CLI
```bash
# 安装 Vercel CLI
npm i -g vercel

# 在项目根目录部署
vercel

# 跟随提示配置项目
```

### 3. 环境变量配置
在 Vercel 项目设置中配置以下环境变量：

#### 必需的环境变量
```env
DATABASE_URL=你的数据库连接字符串
NEXTAUTH_URL=https://你的域名.vercel.app
NEXTAUTH_SECRET=你的安全密钥
```

#### 推荐的数据库选项
1. **Vercel Postgres** (推荐)
   - 在 Vercel 仪表板中创建 Postgres 数据库
   - 自动获取连接字符串

2. **其他云数据库**
   - PlanetScale (MySQL)
   - Supabase (PostgreSQL)
   - Railway (PostgreSQL)

#### 生成 NEXTAUTH_SECRET
```bash
# 在本地生成安全密钥
openssl rand -base64 32
```

### 4. 数据库迁移
部署后需要执行数据库迁移：

#### 方法一: 使用 Vercel 函数
创建 API 路由来执行迁移：
```typescript
// pages/api/migrate.ts
export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      // 执行数据库迁移
      await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS...`;
      res.status(200).json({ message: 'Migration completed' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
```

#### 方法二: 使用 Prisma Migrate
```bash
# 在本地设置生产数据库连接
npx prisma migrate deploy
```

## 本地开发

### 1. 环境设置
```bash
# 克隆仓库
git clone https://github.com/kongdecc/AMZSHOP.git
cd AMZSHOP

# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env.local

# 编辑 .env.local 文件，配置数据库连接
```

### 2. 数据库设置
```bash
# 生成 Prisma 客户端
npx prisma generate

# 推送数据库架构
npx prisma db push

# 初始化数据
npm run db:seed

# 启动开发服务器
npm run dev
```

## 生产环境优化

### 1. 性能优化
- 启用 Next.js 图片优化
- 配置 CDN 缓存
- 使用 Vercel 的边缘网络

### 2. 安全配置
- 启用 HTTPS
- 配置 CSP 头
- 设置安全的 Cookie 策略

### 3. 监控和日志
- 集成 Vercel Analytics
- 配置错误监控 (Sentry)
- 设置性能监控

## 故障排除

### 常见问题

#### 1. 构建失败
- 检查 Node.js 版本 (需要 18+)
- 验证环境变量配置
- 查看构建日志中的具体错误

#### 2. 数据库连接错误
- 验证 DATABASE_URL 格式
- 检查数据库白名单设置
- 确认数据库服务状态

#### 3. 环境变量问题
- 确保所有必需变量已设置
- 检查变量名称拼写
- 重启部署以应用新变量

## 支持

如有问题，请查看：
- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [Vercel 文档](https://vercel.com/docs)

或创建 GitHub Issue 寻求帮助。