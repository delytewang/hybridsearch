// ============================================
// 存储工厂 - 支持 SQLite 和 PostgreSQL
// ============================================

import type { StorageConfig, SQLiteConfig, PostgreSQLConfig } from "../types.js";
import type { StorageBackend } from "./types.js";
import { SQLiteStorage } from "./sqlite/index.js";
import { PostgreSQLStorage } from "./postgres/index.js";

export interface StorageFactory {
  create(config: StorageConfig): Promise<StorageBackend>;
  getType(): "sqlite" | "postgresql";
}

export async function createStorage(config: StorageConfig): Promise<StorageBackend> {
  switch (config.type) {
    case "sqlite":
      return new SQLiteStorage(config);
    case "postgresql":
      return new PostgreSQLStorage(config);
    default:
      throw new Error(`Unsupported storage type: ${(config as StorageConfig).type}`);
  }
}

export function getStorageType(config: StorageConfig): "sqlite" | "postgresql" {
  return config.type;
}
