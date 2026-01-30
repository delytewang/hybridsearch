// ============================================
// PostgreSQL 存储实现 (pgvector)
// ============================================

import type { PostgreSQLConfig, Chunk, VectorSearchOptions, KeywordSearchOptions } from "../../types.js";
import type { StorageBackend } from "../types.js";

export class PostgreSQLStorage implements StorageBackend {
  private config: PostgreSQLConfig;
  private pool: any;
  private tablePrefix: string;

  constructor(config: PostgreSQLConfig) {
    this.config = config;
    this.tablePrefix = config.tablePrefix || "";
  }

  async initialize(): Promise<void> {
    const { Pool } = await import("pg");
    
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    // 测试连接
    const client = await this.pool.connect();
    client.release();
    
    // 初始化表结构
    await this.createTables();
    
    console.log("PostgreSQL storage initialized");
  }

  private async createTables(): Promise<void> {
    const tableName = `${this.tablePrefix}hybridsearch_chunks`;
    
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL,
        content TEXT,
        start_line INTEGER,
        end_line INTEGER,
        metadata JSONB,
        embedding VECTOR(1536),
        updated_at BIGINT
      );
      
      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}hs_path 
        ON ${tableName}(path);
      
      -- pgvector 索引
      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}hs_embedding 
        ON ${tableName} USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100);
      
      -- 全文搜索索引
      ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS fts tsvector;
      CREATE INDEX IF NOT EXISTS idx_${this.tablePrefix}hs_fts 
        ON ${tableName} USING GIN (fts);
    `);
    
    // 创建更新触发器
    await this.pool.query(`
      CREATE OR REPLACE FUNCTION ${this.tablePrefix}update_fts()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.fts := to_tsvector('english', COALESCE(NEW.content, ''));
        NEW.updated_at := EXTRACT(EPOCH FROM NOW())::BIGINT;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      CREATE TRIGGER IF NOT EXISTS ${this.tablePrefix}hs_fts_trigger
      BEFORE INSERT OR UPDATE ON ${tableName}
      FOR EACH ROW EXECUTE FUNCTION ${this.tablePrefix}update_fts();
    `);
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
  }

  async addChunk(chunk: Chunk): Promise<void> {
    const tableName = `${this.tablePrefix}hybridsearch_chunks`;
    
    await this.pool.query(`
      INSERT INTO ${tableName} (id, path, content, start_line, end_line, metadata, embedding, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        start_line = EXCLUDED.start_line,
        end_line = EXCLUDED.end_line,
        metadata = EXCLUDED.metadata,
        embedding = EXCLUDED.embedding,
        fts = to_tsvector('english', EXCLUDED.content),
        updated_at = EXCLUDED.updated_at
    `, [
      chunk.id,
      chunk.path,
      chunk.content,
      chunk.startLine,
      chunk.endLine,
      chunk.metadata ? JSON.stringify(chunk.metadata) : null,
      chunk.embedding ? `[${chunk.embedding.join(",")}]` : null,
      Date.now(),
    ]);
  }

  async addChunks(chunks: Chunk[]): Promise<void> {
    // 批量插入
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      
      for (const chunk of chunks) {
        await this.addChunk(chunk);
      }
      
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async updateChunk(chunk: Chunk): Promise<void> {
    await this.addChunk(chunk);
  }

  async deleteChunk(id: string): Promise<void> {
    const tableName = `${this.tablePrefix}hybridsearch_chunks`;
    await this.pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
  }

  async deleteChunksByPath(path: string): Promise<void> {
    const tableName = `${this.tablePrefix}hybridsearch_chunks`;
    await this.pool.query(`DELETE FROM ${tableName} WHERE path = $1`, [path]);
  }

  async searchByVector(queryVector: number[], options: VectorSearchOptions): Promise<Chunk[]> {
    const tableName = `${this.tablePrefix}hybridsearch_chunks`;
    
    // 使用 pgvector 的余弦相似度搜索
    const result = await this.pool.query(`
      SELECT id, path, content, start_line, end_line, metadata,
             1 - (embedding <=> $1::vector) as score
      FROM ${tableName}
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `, [`[${queryVector.join(",")}]`, options.limit]);
    
    return result.rows.map((row: any) => this.rowToChunk(row));
  }

  async searchByKeyword(query: string, options: KeywordSearchOptions): Promise<Chunk[]> {
    const tableName = `${this.tablePrefix}hybridsearch_chunks`;
    
    // 使用全文搜索
    const result = await this.pool.query(`
      SELECT id, path, content, start_line, end_line, metadata,
             ts_rank(fts, to_tsquery('english', $1)) as score
      FROM ${tableName}
      WHERE fts @@ to_tsquery('english', $1)
      ORDER BY score DESC
      LIMIT $2
    `, [query.split(" ").join(" & "), options.limit]);
    
    return result.rows.map((row: any) => this.rowToChunk(row));
  }

  async getChunk(id: string): Promise<Chunk | null> {
    const tableName = `${this.tablePrefix}hybridsearch_chunks`;
    
    const result = await this.pool.query(
      `SELECT * FROM ${tableName} WHERE id = $1`,
      [id]
    );
    
    return result.rows.length > 0 ? this.rowToChunk(result.rows[0]) : null;
  }

  async getChunksByPath(path: string): Promise<Chunk[]> {
    const tableName = `${this.tablePrefix}hybridsearch_chunks`;
    
    const result = await this.pool.query(
      `SELECT * FROM ${tableName} WHERE path = $1 ORDER BY start_line`,
      [path]
    );
    
    return result.rows.map((row: any) => this.rowToChunk(row));
  }

  async getStats(): Promise<{ files: number; chunks: number }> {
    const tableName = `${this.tablePrefix}hybridsearch_chunks`;
    
    const filesResult = await this.pool.query(
      `SELECT COUNT(DISTINCT path) as count FROM ${tableName}`
    );
    
    const chunksResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    
    return {
      files: parseInt(filesResult.rows[0].count),
      chunks: parseInt(chunksResult.rows[0].count),
    };
  }

  async clear(): Promise<void> {
    const tableName = `${this.tablePrefix}hybridsearch_chunks`;
    await this.pool.query(`DELETE FROM ${tableName}`);
  }

  private rowToChunk(row: any): Chunk {
    return {
      id: row.id,
      path: row.path,
      content: row.content,
      embedding: row.embedding ? Array.from(row.embedding) : undefined,
      startLine: row.start_line,
      endLine: row.end_line,
      metadata: row.metadata,
    };
  }
}
