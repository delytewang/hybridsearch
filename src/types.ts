// ============================================
// HybridSearch 类型定义
// ============================================

// 存储配置类型
export type StorageType = "sqlite" | "postgresql";

export interface SQLiteConfig {
  type: "sqlite";
  path: string;
}

export interface PostgreSQLConfig {
  type: "postgresql";
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  tablePrefix?: string;
  ssl?: boolean;
}

export type StorageConfig = SQLiteConfig | PostgreSQLConfig;

// Embedding 提供商类型
export type EmbeddingProvider = "openai" | "gemini" | "siliconflow" | "ollama" | "local";

export interface OpenAIEmbeddingConfig {
  provider: "openai";
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface GeminiEmbeddingConfig {
  provider: "gemini";
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface SiliconFlowEmbeddingConfig {
  provider: "siliconflow";
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface OllamaEmbeddingConfig {
  provider: "ollama";
  model: string;
  baseUrl: string;
}

export interface LocalEmbeddingConfig {
  provider: "local";
  model: string;
  modelCacheDir?: string;
}

export type EmbeddingConfig =
  | OpenAIEmbeddingConfig
  | GeminiEmbeddingConfig
  | SiliconFlowEmbeddingConfig
  | OllamaEmbeddingConfig
  | LocalEmbeddingConfig;

// 混合搜索配置
export interface HybridSearchConfig {
  vectorWeight?: number;  // 默认 0.7
  textWeight?: number;    // 默认 0.3
}

// 分块配置
export interface ChunkingConfig {
  tokens?: number;    // 默认 512
  overlap?: number;   // 默认 50
}

// 创建选项
export interface HybridSearchOptions {
  // 索引的目录
  dir: string;
  
  // 存储配置
  storage: StorageConfig;
  
  // Embedding 配置
  embedding: EmbeddingConfig;
  
  // 混合搜索权重
  hybrid?: HybridSearchConfig;
  
  // 分块配置
  chunking?: ChunkingConfig;
}

// 搜索结果
export interface SearchResult {
  path: string;           // 文件路径
  startLine: number;      // 开始行
  endLine: number;        // 结束行
  score: number;          // 综合分数
  snippet: string;        // 片段内容
  vectorScore?: number;   // 向量分数
  textScore?: number;     // 文本分数
}

// 搜索选项
export interface SearchOptions {
  maxResults?: number;    // 默认 10
  minScore?: number;      // 默认 0.0
}

// 读取选项
export interface ReadOptions {
  from?: number;  // 开始行，默认 1
  lines?: number; // 行数，默认全文
}

// 读取结果
export interface ReadResult {
  text: string;
  path: string;
}

// 监听选项
export interface WatchOptions {
  onChange?: (file: string) => void;
  onAdd?: (file: string) => void;
  onUnlink?: (file: string) => void;
}

// 索引状态
export interface IndexStatus {
  files: number;
  chunks: number;
  provider: string;
  model: string;
  storageType: StorageType;
}

// Embedding 向量
export type EmbeddingVector = number[];
