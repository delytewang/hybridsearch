// ============================================
// OpenAI Embedding 提供商
// ============================================

import type { OpenAIEmbeddingConfig, EmbeddingVector } from "../types.js";

export interface EmbeddingResult {
  embedding: EmbeddingVector;
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

export class OpenAIEmbedding {
  private config: OpenAIEmbeddingConfig;
  private baseUrl: string;

  constructor(config: OpenAIEmbeddingConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://api.openai.com/v1";
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
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error("No embedding returned from OpenAI");
    }

    return data.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    // OpenAI 有批量限制，分批处理
    const batchSize = 100; // OpenAI 限制
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
        throw new Error(`OpenAI API error: ${error}`);
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
    // 常见模型的维度
    const dimensions: Record<string, number> = {
      "text-embedding-3-small": 1536,
      "text-embedding-3-large": 3072,
      "text-embedding-ada-002": 1536,
    };
    
    return dimensions[this.config.model] || 1536;
  }
}
