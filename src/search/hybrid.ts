// ============================================
// 混合搜索算法 - 融合向量和关键词搜索结果
// ============================================

import type { SearchResult, HybridSearchConfig } from "../types.js";

export interface HybridSearchResult extends SearchResult {
  vectorScore?: number;
  textScore?: number;
}

export class HybridSearch {
  private vectorWeight: number;
  private textWeight: number;

  constructor(config?: HybridSearchConfig) {
    this.vectorWeight = config?.vectorWeight ?? 0.7;
    this.textWeight = config?.textWeight ?? 0.3;
  }

  merge(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    options?: { maxResults?: number; minScore?: number }
  ): HybridSearchResult[] {
    const maxResults = options?.maxResults || 10;
    const minScore = options?.minScore || 0;

    // 创建结果映射
    const resultMap = new Map<string, HybridSearchResult>();

    // 处理向量搜索结果
    for (let i = 0; i < vectorResults.length; i++) {
      const result = vectorResults[i];
      const vectorScore = this.normalizeScore(i, vectorResults.length);
      
      resultMap.set(result.path, {
        ...result,
        score: vectorScore * this.vectorWeight,
        vectorScore,
      });
    }

    // 处理关键词搜索结果（合并到已有结果）
    for (let i = 0; i < keywordResults.length; i++) {
      const result = keywordResults[i];
      const textScore = this.normalizeScore(i, keywordResults.length);
      const combinedScore = textScore * this.textWeight;
      
      if (resultMap.has(result.path)) {
        const existing = resultMap.get(result.path)!;
        existing.score += combinedScore;
        existing.textScore = textScore;
      } else {
        resultMap.set(result.path, {
          ...result,
          score: combinedScore,
          textScore,
        });
      }
    }

    // 排序并返回
    return Array.from(resultMap.values())
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * 使用倒数排名分数 (RRF) 合并结果
   * 适合没有分数的结果
   */
  mergeWithRRF(
    vectorResults: SearchResult[],
    keywordResults: SearchResult[],
    options?: { maxResults?: number; minScore?: number }
  ): HybridSearchResult[] {
    const maxResults = options?.maxResults || 10;
    const minScore = options?.minScore || 0;
    const k = 60; // RRF 常数

    const resultMap = new Map<string, HybridSearchResult>();

    // 处理向量搜索结果
    for (let i = 0; i < vectorResults.length; i++) {
      const result = vectorResults[i];
      const rrfScore = 1 / (k + i + 1);
      const finalScore = rrfScore * this.vectorWeight;
      
      resultMap.set(result.path, {
        ...result,
        score: finalScore,
        vectorScore: rrfScore,
      });
    }

    // 处理关键词搜索结果
    for (let i = 0; i < keywordResults.length; i++) {
      const result = keywordResults[i];
      const rrfScore = 1 / (k + i + 1);
      const combinedScore = rrfScore * this.textWeight;
      
      if (resultMap.has(result.path)) {
        const existing = resultMap.get(result.path)!;
        existing.score += combinedScore;
        existing.textScore = rrfScore;
      } else {
        resultMap.set(result.path, {
          ...result,
          score: combinedScore,
          textScore: rrfScore,
        });
      }
    }

    return Array.from(resultMap.values())
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
  }

  /**
   * 使用倒数排名融合 (RRF) 算法的简化版本
   */
  static rrf(
    results: Map<string, { rank: number; weight: number }>[],
    k = 60
  ): Map<string, number> {
    const scores = new Map<string, number>();

    for (const resultSet of results) {
      for (const [path, { rank, weight }] of resultSet) {
        const rrf = weight * (1 / (k + rank));
        scores.set(path, (scores.get(path) || 0) + rrf);
      }
    }

    return scores;
  }

  private normalizeScore(rank: number, total: number): number {
    if (total === 0) return 0;
    // 分数从 1.0 (第一名) 降到 0.1 (最后一名)
    return Math.max(0.1, 1 - (rank / total) * 0.9);
  }
}
