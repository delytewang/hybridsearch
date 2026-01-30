// ============================================
// Embedding 工厂 - 支持多种提供商
// ============================================

import type { EmbeddingConfig } from "../types.js";
import { OpenAIEmbedding } from "./openai.js";
import { GeminiEmbedding } from "./gemini.js";
import { SiliconFlowEmbedding } from "./siliconflow.js";
import { OllamaEmbedding } from "./ollama.js";

export type EmbeddingProvider = 
  | OpenAIEmbedding 
  | GeminiEmbedding 
  | SiliconFlowEmbedding 
  | OllamaEmbedding;

export type EmbeddingProviderType = 
  | "openai" 
  | "gemini" 
  | "siliconflow" 
  | "ollama" 
  | "local";

export interface EmbeddingProviderResult {
  provider: EmbeddingProvider;
  type: EmbeddingProviderType;
  model: string;
  dimensions: number;
}

export function createEmbeddingProvider(config: EmbeddingConfig): EmbeddingProviderResult {
  switch (config.provider) {
    case "openai":
      return {
        provider: new OpenAIEmbedding(config),
        type: "openai",
        model: config.model,
        dimensions: new OpenAIEmbedding(config).getDimensions(),
      };
    
    case "gemini":
      return {
        provider: new GeminiEmbedding(config),
        type: "gemini",
        model: config.model,
        dimensions: new GeminiEmbedding(config).getDimensions(),
      };
    
    case "siliconflow":
      return {
        provider: new SiliconFlowEmbedding(config),
        type: "siliconflow",
        model: config.model,
        dimensions: new SiliconFlowEmbedding(config).getDimensions(),
      };
    
    case "ollama":
      return {
        provider: new OllamaEmbedding(config),
        type: "ollama",
        model: config.model,
        dimensions: new OllamaEmbedding(config).getDimensions(),
      };
    
    case "local":
      // Local embedding 需要 llama.cpp 支持，这里先留空
      throw new Error("Local embedding not yet implemented. Use 'ollama' for local models.");
    
    default:
      throw new Error(`Unsupported embedding provider: ${(config as any).provider}`);
  }
}

export function getEmbeddingProviderType(config: EmbeddingConfig): EmbeddingProviderType {
  return config.provider;
}
