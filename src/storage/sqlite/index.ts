// ============================================
// SQLite 存储实现 (sqlite-vec)
// ============================================

import type { SQLiteConfig, Chunk, VectorSearchOptions, KeywordSearchOptions } from "../types.js";
import type { StorageBackend } from "../types.js";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const VECTOR_TABLE = "chunks_vec";
const FTS_TABLE = "chunks_fts";
const CHUNKS_TABLE = "chunks";

export class SQLiteStorage implements StorageBackend {
  private dbPath: string;
  private db: any; // sqlite.DatabaseSync
  private tablePrefix: string;

  constructor(config: SQLiteConfig) {
    this.dbPath = config.path;
    this.tablePrefix = "";
  }

  async initialize(): Promise<void> {
    const sqlite = await import("better-sqlite3");
    
    // 确保目录存在
    const dir = path.dirname(this.dbPath);
    await fs.mkdir(dir, { recursive: true });
    
    this.db = new sqlite.default(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    
    // 创建表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tablePrefix}${CHUNKS_TABLE} (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        content TEXT,
        startLine INTEGER,
        endLine INTEGER,
        metadata TEXT,
        embedding BLOB,
        updatedAt INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}chunks_path 
        ON ${this.tablePrefix}${CHUNKS_TABLE}(path);
      
      CREATE VIRTUAL TABLE IF NOT EXISTS ${this.tablePrefix}${FTS_TABLE} USING fts5(
        content, content=${this.tablePrefix}${CHUNKS_TABLE},
        tokenize='porter'
      );
    `);
    
    // sqlite-vec 需要单独处理
    try {
      // 尝试加载 sqlite-vec 扩展
      // 注意：需要在运行时加载扩展
      console.log("SQLite storage initialized (sqlite-vec support requires extension)");
    } catch (err) {
      console.warn("sqlite-vec extension not available, vector search will use fallback");
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
    }
  }

  async addChunk(chunk: Chunk): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.tablePrefix}${CHUNKS_TABLE}
      (id, path, content, startLine, endLine, metadata, embedding, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const embeddingBlob = chunk.embedding 
      ? Buffer.from(new Float32Array(chunk.embedding).buffer)
      : null;
    
    stmt.run(
      chunk.id,
      chunk.path,
      chunk.content,
      chunk.startLine,
      chunk.endLine,
      chunk.metadata ? JSON.stringify(chunk.metadata) : null,
      embeddingBlob,
      Date.now()
    );
    
    // 更新 FTS
    if (chunk.content) {
      const ftsStmt = this.db.prepare(`
        INSERT INTO ${this.tablePrefix}${FTS_TABLE}(rowid, content)
        VALUES ((SELECT rowid FROM ${this.tablePrefix}${CHUNKS_TABLE} WHERE id = ?), ?)
      `);
      ftsStmt.run(chunk.id, chunk.content);
    }
  }

  async addChunks(chunks: Chunk[]): Promise<void> {
    for (const chunk of chunks) {
      await this.addChunk(chunk);
    }
  }

  async updateChunk(chunk: Chunk): Promise<void> {
    await this.addChunk(chunk);
  }

  async deleteChunk(id: string): Promise<void> {
    this.db.prepare(`DELETE FROM ${this.tablePrefix}${CHUNKS_TABLE} WHERE id = ?`).run(id);
  }

  async deleteChunksByPath(path: string): Promise<void> {
    this.db.prepare(`DELETE FROM ${this.tablePrefix}${CHUNKS_TABLE} WHERE path = ?`).run(path);
  }

  async searchByVector(queryVector: number[], options: VectorSearchOptions): Promise<Chunk[]> {
    // sqlite-vec 不可用时的回退方案：使用余弦相似度计算
    // 实际生产中应该使用 sqlite-vec 扩展
    
    const allChunks = this.db.prepare(`
      SELECT * FROM ${this.tablePrefix}${CHUNKS_TABLE}
      WHERE embedding IS NOT NULL
    `).all() as any[];
    
    // 计算相似度
    const results = allChunks
      .map((row: any) => {
        if (!row.embedding) return null;
        
        const embedding = new Float32Array(row.embedding);
        const score = this.cosineSimilarity(queryVector, Array.from(embedding));
        
        return {
          ...row,
          score,
          content: row.content,
        };
      })
      .filter((r: any) => r && r.score >= (options.minScore || 0))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, options.limit);
    
    return results.map(this.rowToChunk);
  }

  async searchByKeyword(query: string, options: KeywordSearchOptions): Promise<Chunk[]> {
    // 使用 FTS 搜索
    const results = this.db.prepare(`
      SELECT *, bm25(${this.tablePrefix}${FTS_TABLE}) as score
      FROM ${this.tablePrefix}${FTS_TABLE}
      WHERE content MATCH ?
      ORDER BY score
      LIMIT ?
    `).all(query + "*") as any[];
    
    // 获取完整 chunk 信息
    const chunks: Chunk[] = [];
    for (const row of results) {
      const chunk = await this.getChunk(row.rowid);
      if (chunk) {
        chunks.push(chunk);
      }
    }
    
    return chunks.slice(0, options.limit);
  }

  async getChunk(id: string): Promise<Chunk | null> {
    const row = this.db.prepare(`
      SELECT * FROM ${this.tablePrefix}${CHUNKS_TABLE} WHERE id = ?
    `).get(id) as any;
    
    return row ? this.rowToChunk(row) : null;
  }

  async getChunksByPath(path: string): Promise<Chunk[]> {
    const rows = this.db.prepare(`
      SELECT * FROM ${this.tablePrefix}${CHUNKS_TABLE} WHERE path = ?
    `).all(path) as any[];
    
    return rows.map(this.rowToChunk);
  }

  async getStats(): Promise<{ files: number; chunks: number }> {
    const files = await this.db.prepare(`
      SELECT COUNT(DISTINCT path) as count FROM ${this.tablePrefix}${CHUNKS_TABLE}
    `).get() as { count: number };
    
    const chunks = await this.db.prepare(`
      SELECT COUNT(*) as count FROM ${this.tablePrefix}${CHUNKS_TABLE}
    `).get() as { count: number };
    
    return {
      files: files.count,
      chunks: chunks.count,
    };
  }

  async clear(): Promise<void> {
    this.db.prepare(`DELETE FROM ${this.tablePrefix}${CHUNKS_TABLE}`).run();
  }

  private rowToChunk(row: any): Chunk {
    const embedding = row.embedding 
      ? Array.from(new Float32Array(row.embedding)) 
      : undefined;
    
    return {
      id: row.id,
      path: row.path,
      content: row.content,
      embedding,
      startLine: row.startLine,
      endLine: row.endLine,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
