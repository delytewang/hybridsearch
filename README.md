# HybridSearch - 本地混合检索方案

> 从 Clawdbot 提取的向量 + 关键词混合搜索库

## 概述

一个轻量级的本地混合检索库，支持向量相似度搜索和全文关键词搜索的融合。

**支持多种存储后端和 Embedding 提供商，开箱即用。**

## 安装

```bash
npm install hybridsearch
# 或
pnpm add hybridsearch
```

## 快速开始

```typescript
import { HybridSearch } from "hybridsearch";

// 创建索引
const search = await HybridSearch.create({
  dir: "./docs",           // 索引目录
  storage: "./.hybridsearch.db",
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  },
});

// 搜索
const results = await search.search("查询内容", { maxResults: 10 });

for (const r of results) {
  console.log(`${r.score.toFixed(3)} ${r.path}:${r.startLine}`);
  console.log(`  ${r.snippet}`);
}
```

## 项目结构

```
hybridsearch/
├── src/
│   ├── index.ts              # 主入口
│   ├── types.ts              # 类型定义
│   ├── storage/              # 存储后端
│   │   ├── factory.ts
│   │   ├── sqlite/           # SQLite + sqlite-vec
│   │   └── postgres/         # PostgreSQL + pgvector
│   ├── embedding/            # Embedding 提供商
│   │   ├── factory.ts
│   │   ├── openai.ts
│   │   ├── gemini.ts
│   │   ├── siliconflow.ts
│   │   └── ollama.ts
│   ├── search/               # 搜索模块
│   │   ├── vector.ts         # 向量搜索
│   │   ├── keyword.ts        # 关键词搜索
│   │   └── hybrid.ts         # 混合搜索
│   ├── chunking/             # 工具
│   │   └── markdown.ts       # Markdown 分块
│   └── watcher/              # 文件监听
│       └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 技术栈

| 组件 | 技术 |
|------|------|
| **向量存储** | SQLite + sqlite-vec **或** PostgreSQL + pgvector |
| **全文搜索** | SQLite FTS5 + BM25 **或** PostgreSQL Full Text Search |
| **Embedding** | OpenAI / Gemini / SiliconFlow / Ollama |
| **文件监听** | chokidar |
| **语言** | TypeScript / Node.js |

## 支持的存储后端

| 后端 | 特点 | 适用场景 |
|------|------|----------|
| **SQLite + sqlite-vec** | 单文件、轻量、无需服务 | 个人/开发环境 |
| **PostgreSQL + pgvector** | 生产级、分布式、高并发 | 团队/生产环境 |

## 支持的 Embedding 提供商

| 提供商 | 类型 | 模型示例 | 特点 |
|--------|------|----------|------|
| **OpenAI** | 云 API | text-embedding-3-small/large | 稳定、成熟 |
| **Google Gemini** | 云 API | text-embedding-004 | 高质量 |
| **SiliconFlow** | 云 API | BAAI/bge-large-zh | 国内访问快、支持中文 |
| **Ollama** | 本地 | nomic-embed-text | 完全离线、私有化 |

## 贡献

欢迎提交 Issue 和 PR！

## 许可证

MIT
```

### 3. SiliconFlow (国内快速访问)

```typescript
const search = await HybridSearch.create({
  dir: "./docs",
  embedding: {
    provider: "siliconflow",
    model: "BAAI/bge-large-zh",  // 支持中文
    apiKey: process.env.SILICONFLOW_API_KEY,
    baseUrl: "https://api.siliconflow.cn/v1",  // 可选，默认官方
  },
});
```

### 4. Ollama 本地模型

```typescript
const search = await HybridSearch.create({
  dir: "./docs",
  embedding: {
    provider: "ollama",
    model: "nomic-embed-text",  // 或 mxbai-embed-large
    baseUrl: "http://localhost:11434",
  },
});
```

### 5. 混合搜索配置

```typescript
const search = await HybridSearch.create({
  dir: "./docs",
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  },
  // 混合搜索权重
  hybrid: {
    vectorWeight: 0.7,  // 向量相似度权重
    textWeight: 0.3,    // 关键词权重
  },
});
```

## API

### `HybridSearch.create(options)`

创建索引实例。

```typescript
interface CreateOptions {
  // 索引的目录
  dir: string;
  
  // 存储配置
  storage: string | StorageConfig;
  
  // Embedding 提供商配置
  embedding: EmbeddingConfig;
  
  // 混合搜索权重
  hybrid?: {
    vectorWeight?: number;  // 默认 0.7
    textWeight?: number;    // 默认 0.3
  };
  
  // 分块配置
  chunking?: {
    tokens?: number;      // 默认 512
    overlap?: number;     // 默认 50
  };
}

// 存储配置
type StorageConfig = 
  | SQLiteConfig      // SQLite + sqlite-vec
  | PostgreSQLConfig; // PostgreSQL + pgvector

interface SQLiteConfig {
  type: "sqlite";
  path: string;  // 数据库文件路径
}

interface PostgreSQLConfig {
  type: "postgresql";
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  tablePrefix?: string;  // 表前缀，默认 ""
  ssl?: boolean;
}

// Embedding 配置
type EmbeddingConfig = 
  | OpenAIConfig
  | GeminiConfig
  | SiliconFlowConfig
  | OllamaConfig
  | LocalConfig;

interface OpenAIConfig {
  provider: "openai";
  model: string;  // text-embedding-3-small, text-embedding-3-large, etc.
  apiKey: string;
  baseUrl?: string;
}

interface GeminiConfig {
  provider: "gemini";
  model: string;  // text-embedding-004
  apiKey: string;
  baseUrl?: string;
}

interface SiliconFlowConfig {
  provider: "siliconflow";
  model: string;  // BAAI/bge-large-zh, etc.
  apiKey: string;
  baseUrl?: string;  // 默认 https://api.siliconflow.cn/v1
}

interface OllamaConfig {
  provider: "ollama";
  model: string;  // nomic-embed-text, mxbai-embed-large, etc.
  baseUrl: string;  // 例如 http://localhost:11434
}

interface LocalConfig {
  provider: "local";
  model: string;  // 模型路径或 HuggingFace ID
  modelCacheDir?: string;
}
```

### `search(query, options)`

搜索。

```typescript
interface SearchOptions {
  maxResults?: number;    // 默认 10
  minScore?: number;      // 默认 0.0
}

interface SearchResult {
  path: string;           // 文件路径
  startLine: number;      // 开始行
  endLine: number;        // 结束行
  score: number;          // 综合分数
  snippet: string;        // 片段内容
  vectorScore?: number;   // 向量分数
  textScore?: number;     // 文本分数
}

const results = await search.search("关键词", {
  maxResults: 10,
  minScore: 0.3,
});
```

### `readFile(path, options)`

读取文件片段。

```typescript
interface ReadOptions {
  from?: number;  // 开始行，默认 1
  lines?: number; // 行数，默认全文
}

const content = await search.readFile("guide.md", {
  from: 10,
  lines: 20,
});
```

### `sync()`

手动同步索引。

```typescript
await search.sync();
```

### `watch(options)`

监听文件变更。

```typescript
await search.watch({
  onChange: (file: string) => console.log(`Changed: ${file}`),
  onAdd: (file: string) => console.log(`Added: ${file}`),
  onUnlink: (file: string) => console.log(`Removed: ${file}`),
});
```

### `status()`

获取索引状态。

```typescript
const status = await search.status();
// {
//   files: 10,
//   chunks: 500,
//   provider: "openai",
//   model: "text-embedding-3-small",
// }
```

## 项目结构

```
hybridsearch/
├── src/
│   ├── index.ts              # 主入口
│   ├── types.ts              # 类型定义
│   │
│   ├── embedding/
│   │   ├── types.ts
│   │   ├── factory.ts        # 提供商工厂
│   │   ├── openai.ts
│   │   ├── gemini.ts
│   │   ├── siliconflow.ts    # 新增
│   │   ├── ollama.ts         # 新增
│   │   └── local.ts
│   │
│   ├── storage/
│   │   ├── types.ts
│   │   ├── factory.ts        # 存储工厂
│   │   ├── sqlite/
│   │   │   ├── index.ts      # SQLite 封装
│   │   │   └── vec.ts        # sqlite-vec 封装
│   │   └── postgres/         # 新增
│   │       ├── index.ts      # PostgreSQL 封装
│   │       └── pgvector.ts   # pgvector 封装
│   │
│   ├── search/
│   │   ├── types.ts
│   │   ├── hybrid.ts         # 混合搜索算法
│   │   ├── vector.ts         # 向量搜索
│   │   └── keyword.ts        # 关键词搜索
│   │
│   ├── chunking/
│   │   ├── types.ts
│   │   └── markdown.ts       # Markdown 智能分块
│   │
│   └── watcher/
│       ├── types.ts
│       └── index.ts          # 文件监听 + 增量同步
│
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## 混合搜索算法

```typescript
// 1. 向量搜索 (余弦相似度)
vectorScore = cosineSimilarity(queryVec, docVec);

// 2. 关键词搜索 (BM25)
textScore = bm25(query, doc);

// 3. 合并 (可配置权重)
finalScore = vectorWeight * vectorScore + textWeight * textScore;
```

## 对比现有方案

| 特性 | HybridSearch | Chroma | Weaviate |
|------|-------------|--------|----------|
| 部署 | 单文件 | 服务 | 服务/容器 |
| 存储 | SQLite / PostgreSQL | RocksDB | Dedup |
| 混合搜索 | ✅ | ✅ | ✅ |
| 本地 embedding | ✅ (Ollama/llama.cpp) | 有限 | 有限 |
| 中文支持 | ✅ (SiliconFlow/bge) | ✅ | ✅ |
| 体积 | 轻量 | 中等 | 较重 |

## 支持的 Embedding 模型

### OpenAI

| 模型 | 维度 | 备注 |
|------|------|------|
| text-embedding-3-small | 1536 | 性价比高 |
| text-embedding-3-large | 3072 | 高精度 |
| text-embedding-ada-002 | 1536 | 经典模型 |

### Google Gemini

| 模型 | 维度 | 备注 |
|------|------|------|
| text-embedding-004 | 768 | Gemini 默认 |

### SiliconFlow

| 模型 | 维度 | 备注 |
|------|------|------|
| BAAI/bge-large-zh | 1024 | 中文优化 |
| BAAI/bge-base-zh | 768 | 中文平衡 |
| BAAI/bge-small-zh | 512 | 中文轻量 |
| thenlper/gte-large | 1024 | 通用 |

### Ollama

| 模型 | 维度 | 显存需求 |
|------|------|----------|
| nomic-embed-text | 768 | ~4GB |
| mxbai-embed-large | 1024 | ~8GB |
| multilingual-e5-large | 1024 | ~8GB |

## PostgreSQL 初始化

```sql
-- 安装 pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建表
CREATE TABLE hybridsearch_chunks (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    content TEXT,
    embedding VECTOR(1536),
    metadata JSONB
);

-- 创建索引
CREATE INDEX idx_embedding ON hybridsearch_chunks 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- FTS 索引
ALTER TABLE hybridsearch_chunks 
    ADD COLUMN fts tsvector;
CREATE INDEX idx_fts ON hybridsearch_chunks USING GIN (fts);
```

## 使用场景

✅ 个人知识库搜索  
✅ 项目文档检索  
✅ 代码库语义搜索  
✅ 离线搜索需求  
✅ 团队协作（PostgreSQL）  
✅ 中文内容搜索（SiliconFlow/bge）  

❌ 超大规模（百万级+）- 建议用专用向量数据库  
❌ 分布式部署 - 建议用 Qdrant/Milvus |

## 后续规划

- [ ] 实现 SQLite + sqlite-vec 存储
- [ ] 实现 PostgreSQL + pgvector 存储
- [ ] 实现 OpenAI/Gemini/SiliconFlow/Ollama embedding
- [ ] 混合搜索算法
- [ ] 文件监听 + 增量同步
- [ ] 单元测试
- [ ] Web 管理界面
- [ ] HTTP 服务模式

## 许可证

MIT
