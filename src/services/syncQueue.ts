// Sync Queue for offline-first operations
// Stores operations in IndexedDB and retries with exponential backoff

import { storage } from "./storage";
import { SyncQueueItem } from "../types";
import { apiClient } from "./apiClient";

const SYNC_QUEUE_STORE = "syncQueue";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

class SyncQueue {
  private isProcessing = false;

  async enqueue(item: Omit<SyncQueueItem, "id" | "status" | "retries" | "createdAt">): Promise<string> {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: "pending",
      retries: 0,
      createdAt: new Date().toISOString(),
    };

    await storage.setItem(SYNC_QUEUE_STORE, queueItem.id, queueItem);
    
    // Trigger processing if online
    if (navigator.onLine) {
      this.processQueue();
    }

    return queueItem.id;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;

    try {
      const queue = await storage.getAllItems<SyncQueueItem>(SYNC_QUEUE_STORE);
      const pendingItems = queue
        .filter((item) => item.status === "pending" || item.status === "failed")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      for (const item of pendingItems) {
        if (item.retries >= MAX_RETRIES) {
          // Mark as permanently failed
          await storage.setItem(SYNC_QUEUE_STORE, item.id, {
            ...item,
            status: "failed" as const,
            error: "Max retries exceeded",
          });
          continue;
        }

        try {
          await this.processItem(item);
          await storage.setItem(SYNC_QUEUE_STORE, item.id, {
            ...item,
            status: "synced" as const,
            lastAttempt: new Date().toISOString(),
          });
        } catch (error) {
          const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, item.retries);
          await storage.setItem(SYNC_QUEUE_STORE, item.id, {
            ...item,
            status: "failed" as const,
            retries: item.retries + 1,
            lastAttempt: new Date().toISOString(),
            error: error instanceof Error ? error.message : "Unknown error",
          });

          // Schedule retry
          setTimeout(() => this.processQueue(), retryDelay);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
    const { entity, action, data } = item;

    switch (entity) {
      case "booking":
        if (action === "create") {
          await apiClient.bookings.create(data);
        } else if (action === "update") {
          await apiClient.bookings.updateStatus(data.id, data.status);
        }
        break;

      case "calendarBlock":
        if (action === "create") {
          await apiClient.calendar.create(data);
        } else if (action === "delete") {
          await apiClient.calendar.delete(data.id);
        }
        break;

      case "media":
        if (action === "delete") {
          await apiClient.media.delete(data.id);
        } else if (action === "update") {
          await apiClient.media.updateOrder(data.artistId, data.mediaIds);
        }
        break;

      case "service":
        if (action === "create") {
          await apiClient.services.create(data);
        } else if (action === "update") {
          await apiClient.services.update(data.id, data);
        }
        break;
    }
  }

  async getPendingCount(): Promise<number> {
    const queue = await storage.getAllItems<SyncQueueItem>(SYNC_QUEUE_STORE);
    return queue.filter((item) => item.status === "pending" || item.status === "failed").length;
  }

  async clearSynced(): Promise<void> {
    const queue = await storage.getAllItems<SyncQueueItem>(SYNC_QUEUE_STORE);
    const syncedItems = queue.filter((item) => item.status === "synced");
    
    for (const item of syncedItems) {
      await storage.removeItem(SYNC_QUEUE_STORE, item.id);
    }
  }

  async retry(itemId: string): Promise<void> {
    const item = await storage.getItem<SyncQueueItem>(SYNC_QUEUE_STORE, itemId);
    if (item) {
      await storage.setItem(SYNC_QUEUE_STORE, itemId, {
        ...item,
        status: "pending" as const,
        retries: 0,
      });
      this.processQueue();
    }
  }
}

export const syncQueue = new SyncQueue();
