import { useState, useEffect } from "react";
import { syncQueue } from "../services/syncQueue";
import { useOnlineStatus } from "./useOnlineStatus";

export function useSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const isOnline = useOnlineStatus();

  const refreshPendingCount = async () => {
    const count = await syncQueue.getPendingCount();
    setPendingCount(count);
  };

  useEffect(() => {
    refreshPendingCount();

    // Refresh count every 5 seconds
    const interval = setInterval(refreshPendingCount, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      // Trigger sync when coming back online
      syncQueue.processQueue();
      
      // Refresh count after a delay to see sync results
      setTimeout(refreshPendingCount, 2000);
    }
  }, [isOnline, pendingCount]);

  return {
    pendingCount,
    isOnline,
    refreshPendingCount,
  };
}
