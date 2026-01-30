// ============================================
// Ollama Embedding 提供商 (本地模型)
// ============================================

import type { OllamaEmbeddingConfig, EmbeddingVector } from "../types.js";

export class OllamaEmbedding {
  private config: OllamaEmbeddingConfig;

  constructor(config: OllamaEmbeddingConfig) {
    this.config = config;
  }

  async embed(text: string): Promise<EmbeddingVector> {
    const response = await fetch(`${this.config.baseUrl}/api/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    const data = await response.json();
    
    if (!data.embeddings || data.embeddings.length === 0) {
      throw new Error("No embedding returned from Ollama");
    }

    return data.embeddings[0];
  }

  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    // Ollama 支持批量
    const response = await fetch(`${this.config.baseUrl}/api/embed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${error}`);
    }

    const data = await response.json();
    
    return data.embeddings || [];
  }

  async getModelInfo(): Promise<{ size: number; parameters: string; format: string }> {
    const response = await fetch(`${this.config.baseUrl}/api/show`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: this.config.model }),
    });

    if (!response.ok) {
      throw new Error("Failed to get model info from Ollama");
    }

    const data = await response.json();
    return {
      size: data.size || 0,
      parameters: data.parameters || "unknown",
      format: data.format || "unknown",
    };
  }

  getModel(): string {
    return this.config.model;
  }

  getDimensions(): number {
    // 常见 Ollama embedding 模型维度
    const dimensions: Record<string, number> = {
      "nomic-embed-text": 768,
      "mxbai-embed-large": 1024,
      "multilingual-e5-large": 1024,
      "bge-large": 1024,
      "bge-base": 768,
      "bge-small": 512,
      "snowflake-arctic-embed": 768,
    };
    
    return dimensions[this.config.model] || 768;
  }
}
