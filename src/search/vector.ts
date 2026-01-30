// ============================================
// 向量搜索模块
// ============================================

import type { EmbeddingVector, SearchResult } from "../types.js";
import type { StorageBackend, VectorSearchOptions } from "../storage/types.js";

export interface VectorSearcher {
  search(
    queryVector: EmbeddingVector,
    options: VectorSearchOptions
  ): Promise<SearchResult[]>;
}

export class VectorSearch implements VectorSearcher {
  private storage: StorageBackend;

  constructor(storage: StorageBackend) {
    this.storage = storage;
  }

  async search(
    queryVector: EmbeddingVector,
    options: VectorSearchOptions
  ): Promise<SearchResult[]> {
    const chunks = await this.storage.searchByVector(queryVector, {
      limit: options.maxResults || 10,
      minScore: options.minScore,
    });

    return chunks.map((chunk) => ({
      path: chunk.path,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      score: 0, // 会在合并时设置
      snippet: this.extractSnippet(chunk.content, chunk.startLine),
      vectorScore: 0, // 会在合并时设置
    }));
  }

  private extractSnippet(content: string, startLine: number): string {
    const lines = content.split("\n");
    const start = Math.max(0, startLine - 1);
    const end = Math.min(lines.length, start + 5);
    return lines.slice(start, end).join(" ").substring(0, 200);
  }
}
