// ============================================
// 关键词搜索模块
// ============================================

import type { SearchResult } from "../types.js";
import type { StorageBackend, KeywordSearchOptions } from "../storage/types.js";

export class KeywordSearch {
  private storage: StorageBackend;

  constructor(storage: StorageBackend) {
    this.storage = storage;
  }

  async search(
    query: string,
    options: KeywordSearchOptions
  ): Promise<SearchResult[]> {
    const chunks = await this.storage.searchByKeyword(query, {
      limit: options.limit || 10,
    });

    return chunks.map((chunk) => ({
      path: chunk.path,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      score: 0, // 会在合并时设置
      snippet: this.extractSnippet(chunk.content, chunk.startLine),
      textScore: 0, // 会在合并时设置
    }));
  }

  private extractSnippet(content: string, startLine: number): string {
    const lines = content.split("\n");
    const start = Math.max(0, startLine - 1);
    const end = Math.min(lines.length, start + 5);
    return lines.slice(start, end).join(" ").substring(0, 200);
  }
}
