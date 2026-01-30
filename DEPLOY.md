# HybridSearch 部署指南

## 安装依赖

```bash
cd hybridsearch
npm install
```

## 配置说明

### 环境变量

创建 `.env` 文件：

```bash
# OpenAI (可选)
OPENAI_API_KEY=sk-xxx

# Gemini (可选)
GEMINI_API_KEY=xxx

# SiliconFlow (可选)
SILICONFLOW_API_KEY=xxx

# PostgreSQL (可选)
POSTGRES_PASSWORD=xxx
```

### 存储后端配置

#### SQLite (默认)

```typescript
const search = await HybridSearch.create({
  dir: "./docs",
  storage: {
    type: "sqlite",
    path: "./.hybridsearch.db",
  },
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  },
});
```

#### PostgreSQL + pgvector

**1. 安装 pgvector：**

```bash
# macOS
brew install postgresql pgvector

# 或从源码安装
git clone https://github.com/pgvector/pgvector
cd pgvector
make
make install
```

**2. 创建数据库：**

```sql
CREATE DATABASE hybridsearch;

\c hybridsearch

-- 启用 pgvector
CREATE EXTENSION IF NOT EXISTS vector;
```

**3. 配置连接：**

```typescript
const search = await HybridSearch.create({
  dir: "./docs",
  storage: {
    type: "postgresql",
    host: "localhost",
    port: 5432,
    database: "hybridsearch",
    user: "postgres",
    password: process.env.POSTGRES_PASSWORD,
    tablePrefix: "hs_",  // 可选，支持多租户
  },
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  },
});
```

### Embedding 提供商配置

#### OpenAI

```typescript
embedding: {
  provider: "openai",
  model: "text-embedding-3-small", // 或 text-embedding-3-large
  apiKey: process.env.OPENAI_API_KEY,
}
```

#### Google Gemini

```typescript
embedding: {
  provider: "gemini",
  model: "text-embedding-004",
  apiKey: process.env.GEMINI_API_KEY,
}
```

#### SiliconFlow (国内推荐)

```typescript
embedding: {
  provider: "siliconflow",
  model: "BAAI/bge-large-zh",  // 支持中文
  apiKey: process.env.SILICONFLOW_API_KEY,
}
```

#### Ollama (本地)

```typescript
embedding: {
  provider: "ollama",
  model: "nomic-embed-text",  // 或 mxbai-embed-large
  baseUrl: "http://localhost:11434",
}
```

**安装 Ollama：**
```bash
# macOS
brew install ollama

# 拉取模型
ollama pull nomic-embed-text
```

## 构建

```bash
npm run build
```

输出在 `dist/` 目录。

## 运行测试

```bash
npm test
```

## 部署方案

### 1. 本地开发

```bash
npm run dev
```

### 2. Docker 部署 (SQLite)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

```bash
docker build -t hybridsearch .
docker run -v ./docs:/app/docs -v ./data:/app/data hybridsearch
```

### 3. Docker 部署 (PostgreSQL)

```yaml
# docker-compose.yml
version: '3.8'

services:
  hybridsearch:
    build: .
    environment:
      - POSTGRES_PASSWORD=xxx
    volumes:
      - ./docs:/app/docs
    depends_on:
      - postgres

  postgres:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_DB: hybridsearch
      POSTGRES_PASSWORD: xxx
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```bash
docker-compose up -d
```

### 4. Vercel / Netlify 部署

创建 `vercel.json`：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install"
}
```

### 5. Node.js 服务部署

```bash
# 1. 构建
npm run build

# 2. 部署
scp -r dist user@server:/path/to/hybridsearch

# 3. 使用 PM2 管理
npm install -g pm2
pm2 start dist/index.js --name hybridsearch
```

## 生产环境建议

| 配置 | 建议 |
|------|------|
| **内存** | 最低 4GB，推荐 8GB+ |
| **存储** | SSD，建议 50GB+ |
| **并发** | 使用 PostgreSQL 处理高并发 |
| **监控** | 添加日志和指标收集 |
| **备份** | 定期备份 SQLite 文件或 PostgreSQL 数据库 |

## 常见问题

### Q: SQLite vs PostgreSQL 用哪个？

- **个人/开发** → SQLite (简单、无需额外服务)
- **生产/团队** → PostgreSQL (高性能、可扩展)

### Q:Embedding 速度慢？

- 使用 **SiliconFlow** (国内访问快)
- 或使用 **Ollama** 本地模型

### Q:搜索结果不准确？

- 调整混合搜索权重：`hybrid: { vectorWeight: 0.7, textWeight: 0.3 }`
- 尝试不同的 embedding 模型

## 监控和维护

### 健康检查

```typescript
const status = await search.status();
console.log(status);
// { files: 100, chunks: 500, provider: "openai", ... }
```

### 日志

建议集成日志库（如 pino）记录搜索查询和性能指标。
