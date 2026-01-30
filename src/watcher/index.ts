// ============================================
// 文件监听 + 增量同步模块
// ============================================

import type { WatchOptions } from "../types.js";
import chokidar, { type FSWatcher } from "chokidar";
import path from "node:path";

export class FileWatcher {
  private dir: string;
  private watcher: FSWatcher | null = null;
  private options: WatchOptions;
  private isWatching: boolean = false;

  constructor(dir: string, options: WatchOptions = {}) {
    this.dir = dir;
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.isWatching) return;

    this.watcher = chokidar.watch(this.dir, {
      ignored: /^\./, // 忽略隐藏文件
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    // 监听事件
    this.watcher
      .on("add", (filePath) => {
        const relPath = path.relative(this.dir, filePath);
        this.options.onAdd?.(relPath);
      })
      .on("change", (filePath) => {
        const relPath = path.relative(this.dir, filePath);
        this.options.onChange?.(relPath);
      })
      .on("unlink", (filePath) => {
        const relPath = path.relative(this.dir, filePath);
        this.options.onUnlink?.(relPath);
      })
      .on("error", (err) => {
        console.error("File watcher error:", err);
      });

    this.isWatching = true;
    console.log(`File watcher started for: ${this.dir}`);
  }

  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      console.log("File watcher stopped");
    }
  }

  isActive(): boolean {
    return this.isWatching;
  }

  getWatchedPaths(): string[] {
    if (!this.watcher) return [];
    return this.watcher.getWatched().directories || [];
  }
}
