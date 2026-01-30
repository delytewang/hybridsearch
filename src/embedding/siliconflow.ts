// ============================================
// SiliconFlow Embedding 提供商
// ============================================

import type { SiliconFlowEmbeddingConfig, EmbeddingVector } from "../types.js";

export class SiliconFlowEmbedding {
  private config: SiliconFlowEmbeddingConfig;
  private baseUrl: string;

  constructor(config: SiliconFlowEmbeddingConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://api.siliconflow.cn/v1";
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SiliconFlow API error: ${error}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error("No embedding returned from SiliconFlow");
    }

    return data.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    const batchSize = 50; // SiliconFlow 限制
    const results: EmbeddingVector[] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          input: batch,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`SiliconFlow API error: ${error}`);
      }

      const data = await response.json();
      
      for (const item of data.data) {
        results.push(item.embedding);
      }
    }
    
    return results;
  }

  getModel(): string {
    return this.config.model;
  }

  getDimensions(): number {
    // BGE 模型维度
    const dimensions: Record<string, number> = {
      "BAAI/bge-large-zh": 1024,
      "BAAI/bge-base-zh": 768,
      "BAAI/bge-small-zh": 512,
      "thenlper/gte-large": 1024,
    };
    
    return dimensions[this.config.model] || 1024;
  }
}
