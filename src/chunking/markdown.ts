// ============================================
// Markdown 智能分块
// ============================================

import type { ChunkingConfig } from "../types.js";

export interface Chunk {
  id: string;
  path: string;
  content: string;
  startLine: number;
  endLine: number;
  metadata?: {
    title?: string;
    headers?: string[];
  };
}

export class MarkdownChunker {
  private tokensPerChunk: number;
  private overlapTokens: number;

  constructor(config?: ChunkingConfig) {
    this.tokensPerChunk = config?.tokens || 512;
    this.overlapTokens = config?.overlap || 50;
  }

  chunk(content: string, filePath: string): Chunk[] {
    const lines = content.split("\n");
    const chunks: Chunk[] = [];
    
    let currentChunk: string[] = [];
    let currentStartLine = 1;
    let currentTokens = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineTokens = this.countTokens(line);
      
      // 检查是否需要分块
      if (currentTokens + lineTokens > this.tokensPerChunk && currentChunk.length > 0) {
        // 保存当前块
        const chunkContent = currentChunk.join("\n");
        chunks.push({
          id: `${filePath}:${currentStartLine}`,
          path: filePath,
          content: chunkContent,
          startLine: currentStartLine,
          endLine: i,
          metadata: this.extractMetadata(currentChunk),
        });
        
        // 计算重叠部分
        const overlapLines = this.calculateOverlapLines(currentChunk);
        currentChunk = overlapLines;
        currentStartLine = i - overlapLines.length + 1;
        currentTokens = this.countTokens(currentChunk.join("\n"));
      }
      
      currentChunk.push(line);
      currentTokens += lineTokens;
    }
    
    // 保存最后一个块
    if (currentChunk.length > 0) {
      chunks.push({
        id: `${filePath}:${currentStartLine}`,
        path: filePath,
        content: currentChunk.join("\n"),
        startLine: currentStartLine,
        endLine: lines.length,
        metadata: this.extractMetadata(currentChunk),
      });
    }
    
    return chunks;
  }

  private countTokens(text: string): number {
    // 简单的中文/英文 token 计数
    // 英文：按空格分词
    // 中文：按字符
    return text.split(/\s+/).length;
  }

  private calculateOverlapLines(chunk: string[]): string[] {
    const overlapTokens = this.overlapTokens;
    let tokenCount = 0;
    const overlapLines: string[] = [];
    
    // 从后往前计算重叠
    for (let i = chunk.length - 1; i >= 0; i--) {
      const lineTokens = this.countTokens(chunk[i]);
      if (tokenCount + lineTokens > overlapTokens) {
        break;
      }
      overlapLines.unshift(chunk[i]);
      tokenCount += lineTokens;
    }
    
    return overlapLines;
  }

  private extractMetadata(lines: string[]): { title?: string; headers?: string[] } {
    const metadata: { title?: string; headers?: string[] } = {};
    const headers: string[] = [];
    
    for (const line of lines) {
      // 匹配 # 标题
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2].trim();
        
        if (level === 1 && !metadata.title) {
          metadata.title = title;
        }
        
        headers.push(line.trim());
      }
    }
    
    if (headers.length > 0) {
      metadata.headers = headers;
    }
    
    return metadata;
  }
}

// 单例实例
let chunker: MarkdownChunker | null = null;

export function getChunker(config?: ChunkingConfig): MarkdownChunker {
  if (!chunker || config) {
    chunker = new MarkdownChunker(config);
  }
  return chunker;
}
