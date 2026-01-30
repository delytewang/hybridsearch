// ============================================
// 存储后端接口定义
// ============================================

import type { EmbeddingVector } from "../types.js";

export interface Chunk {
  id: string;
  path: string;
  content: string;
  embedding?: EmbeddingVector;
  startLine: number;
  endLine: number;
  metadata?: Record<string, unknown>;
}

export interface StorageBackend {
  // 初始化
  initialize(): Promise<void>;
  
  // 关闭连接
  close(): Promise<void>;
  
  // 索引操作
  addChunk(chunk: Chunk): Promise<void>;
  addChunks(chunks: Chunk[]): Promise<void>;
  updateChunk(chunk: Chunk): Promise<void>;
  deleteChunk(id: string): Promise<void>;
  deleteChunksByPath(path: string): Promise<void>;
  
  // 查询操作
  searchByVector(queryVector: EmbeddingVector, limit: number): Promise<Chunk[]>;
  searchByKeyword(query: string, limit: number): Promise<Chunk[]>;
  getChunk(id: string): Promise<Chunk | null>;
  getChunksByPath(path: string): Promise<Chunk[]>;
  
  // 统计
  getStats(): Promise<{ files: number; chunks: number }>;
  
  // 管理
  clear(): Promise<void>;
}

export interface VectorSearchOptions {
  limit: number;
  minScore?: number;
}

export interface KeywordSearchOptions {
  limit: number;
}
