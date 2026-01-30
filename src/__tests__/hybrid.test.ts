// ============================================
// 混合搜索测试
// ============================================

import { describe, it, expect } from "vitest";
import { HybridSearch } from "../search/hybrid.js";
import type { SearchResult } from "../types.js";

describe("HybridSearch", () => {
  describe("merge", () => {
    it("should merge vector and keyword results", () => {
      const vectorResults: SearchResult[] = [
        {
          path: "file1.md",
          startLine: 1,
          endLine: 5,
          score: 0.9,
          snippet: "content",
        },
        {
          path: "file2.md",
          startLine: 10,
          endLine: 15,
          score: 0.8,
          snippet: "content",
        },
      ];

      const keywordResults: SearchResult[] = [
        {
          path: "file2.md",
          startLine: 10,
          endLine: 15,
          score: 0.7,
          snippet: "content",
        },
        {
          path: "file3.md",
          startLine: 20,
          endLine: 25,
          score: 0.6,
          snippet: "content",
        },
      ];

      const hybrid = new HybridSearch({
        vectorWeight: 0.7,
        textWeight: 0.3,
      });

      const results = hybrid.merge(vectorResults, keywordResults, {
        maxResults: 10,
      });

      // file2 应该在最前面（两个结果合并）
      expect(results[0].path).toBe("file2.md");
      expect(results.length).toBe(3);
    });

    it("should filter results below minScore", () => {
      const vectorResults: SearchResult[] = [
        {
          path: "low-score.md",
          startLine: 1,
          endLine: 5,
          score: 0.1,
          snippet: "content",
        },
      ];

      const keywordResults: SearchResult[] = [];

      const hybrid = new HybridSearch({
        vectorWeight: 0.7,
        textWeight: 0.3,
      });

      const results = hybrid.merge(vectorResults, keywordResults, {
        maxResults: 10,
        minScore: 0.3,
      });

      expect(results.length).toBe(0);
    });

    it("should limit results to maxResults", () => {
      const vectorResults = Array.from({ length: 20 }, (_, i) => ({
        path: `file${i}.md`,
        startLine: 1,
        endLine: 5,
        score: 0.9 - i * 0.04,
        snippet: "content",
      }));

      const keywordResults: SearchResult[] = [];

      const hybrid = new HybridSearch();
      const results = hybrid.merge(vectorResults, keywordResults, {
        maxResults: 5,
      });

      expect(results.length).toBe(5);
    });
  });

  describe("mergeWithRRF", () => {
    it("should use RRF for ranking", () => {
      const vectorResults: SearchResult[] = [
        {
          path: "rank1.md",
          startLine: 1,
          endLine: 5,
          score: 0,
          snippet: "content",
        },
      ];

      const keywordResults: SearchResult[] = [
        {
          path: "rank2.md",
          startLine: 1,
          endLine: 5,
          score: 0,
          snippet: "content",
        },
      ];

      const hybrid = new HybridSearch();
      const results = hybrid.mergeWithRRF(vectorResults, keywordResults);

      expect(results.length).toBe(2);
      // Both should have scores from RRF
      expect(results[0].score).toBeGreaterThan(0);
    });
  });
});
