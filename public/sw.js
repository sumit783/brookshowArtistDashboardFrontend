// Service Worker for BrookShow PWA
// ONLINE ONLY - Does not provide offline functionality

const CACHE_NAME = "brookshow-v1";

// Install event - only cache when online
self.addEventListener("install", (event) => {
  console.log("Service worker installed (online mode only)");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service worker activated");
  event.waitUntil(self.clients.claim());
});

// Fetch event - always use network, no offline caching
self.addEventListener("fetch", (event) => {
  // Always fetch from network - do not serve from cache
  event.respondWith(
    fetch(event.request).catch(() => {
      // If offline, return a basic error response
      return new Response(
        JSON.stringify({ error: "Network connection required" }),
        {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({ "Content-Type": "application/json" }),
        }
      );
    })
  );
});

// Background sync - only works when online
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-queue") {
    event.waitUntil(
      self.registration.showNotification("BrookShow", {
        body: "Syncing changes...",
        icon: "/placeholder.svg",
      })
    );
  }
});
