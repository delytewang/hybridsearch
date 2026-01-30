// ============================================
// Google Gemini Embedding 提供商
// ============================================

import type { GeminiEmbeddingConfig, EmbeddingVector } from "../types.js";

export class GeminiEmbedding {
  private config: GeminiEmbeddingConfig;
  private baseUrl: string;

  constructor(config: GeminiEmbeddingConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://generativelanguage.googleapis.com/v1beta";
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const url = `${this.baseUrl}/models/${this.config.model}:embedContent`;
    
    const response = await fetch(`${url}?key=${this.config.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: {
          parts: [{ text }],
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    
    if (!data.embedding || !data.embedding.values) {
      throw new Error("No embedding returned from Gemini");
    }

    return data.embedding.values;
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    const results: EmbeddingVector[] = [];
    
    for (const text of texts) {
      const embedding = await this.embed(text);
      results.push(embedding);
    }
    
    return results;
  }

  getModel(): string {
    return this.config.model;
  }

  getDimensions(): number {
    return 768; // Gemini text-embedding-004 默认维度
  }
}
