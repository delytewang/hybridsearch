// ============================================
// HybridSearch 主入口
// ============================================

import type { 
  HybridSearchOptions, 
  SearchResult, 
  SearchOptions,
  ReadOptions,
  ReadResult,
  IndexStatus 
} from "./types.js";
import { createStorage, getStorageType } from "./storage/factory.js";
import { createEmbeddingProvider, getEmbeddingProviderType } from "./embedding/factory.js";
import { VectorSearch } from "./search/vector.js";
import { KeywordSearch } from "./search/keyword.js";
import { HybridSearch } from "./search/hybrid.js";

export class HybridSearch {
  private options: Required<HybridSearchOptions>;
  private storage: ReturnType<typeof createStorage>;
  private embedding: ReturnType<typeof createEmbeddingProvider>;
  private vectorSearcher: VectorSearch;
  private keywordSearcher: KeywordSearch;
  private hybridSearcher: HybridSearch;
  private initialized: boolean = false;

  private constructor(options: HybridSearchOptions) {
    this.options = {
      dir: options.dir,
      storage: options.storage,
      embedding: options.embedding,
      hybrid: options.hybrid || { vectorWeight: 0.7, textWeight: 0.3 },
      chunking: options.chunking || { tokens: 512, overlap: 50 },
    };

    this.storage = createStorage(this.options.storage);
    this.embedding = createEmbeddingProvider(this.options.embedding);
    this.vectorSearcher = new VectorSearch(this.storage as any);
    this.keywordSearcher = new KeywordSearch(this.storage as any);
    this.hybridSearcher = new HybridSearch(this.options.hybrid);
  }

  static async create(options: HybridSearchOptions): Promise<HybridSearch> {
    const instance = new HybridSearch(options);
    await instance.initialize();
    return instance;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.storage.initialize();
    this.initialized = true;
  }

  async search(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const maxResults = options?.maxResults || 10;
    const minScore = options?.minScore || 0;

    // 生成查询向量
    const queryVector = await this.embedding.provider.embed(query);

    // 并行执行向量搜索和关键词搜索
    const [vectorResults, keywordResults] = await Promise.all([
      this.vectorSearcher.search(queryVector, { 
        limit: maxResults, 
        minScore: minScore * 0.5 
      }),
      this.keywordSearcher.search(query, { 
        limit: maxResults 
      }),
    ]);

    // 混合搜索
    return this.hybridSearcher.merge(vectorResults, keywordResults, {
      maxResults,
      minScore,
    });
  }

  async searchVector(queryVector: number[], options?: SearchOptions): Promise<SearchResult[]> {
    await this.ensureInitialized();
    
    return this.vectorSearcher.search(queryVector, {
      limit: options?.maxResults || 10,
      minScore: options?.minScore,
    });
  }

  async searchKeyword(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    await this.ensureInitialized();
    
    return this.keywordSearcher.search(query, {
      limit: options?.maxResults || 10,
    });
  }

  async readFile(path: string, options?: ReadOptions): Promise<ReadResult> {
    await this.ensureInitialized();
    
    // TODO: 实现文件读取
    return {
      path,
      text: "",
    };
  }

  async sync(): Promise<void> {
    await this.ensureInitialized();
    // TODO: 实现增量同步
  }

  async status(): Promise<IndexStatus> {
    await this.ensureInitialized();
    
    const stats = await (this.storage as any).getStats();
    
    return {
      files: stats.files,
      chunks: stats.chunks,
      provider: getEmbeddingProviderType(this.options.embedding),
      model: this.embedding.model,
      storageType: getStorageType(this.options.storage),
    };
  }

  async close(): Promise<void> {
    if (this.storage) {
      await this.storage.close();
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}

export { createStorage, createEmbeddingProvider };
