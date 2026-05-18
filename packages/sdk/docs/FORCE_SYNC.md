# Force Sync API — ZerithDB SDK

ZerithDB automatically syncs data across peers via its CRDT + WebRTC mesh. However, there are
scenarios where you may want to **manually trigger a sync round** — for example, after coming back
online, before a critical write, or during debugging.

This document covers all the APIs available to force a sync programmatically.

---

## Table of Contents

- [When to use Force Sync](#when-to-use-force-sync)
- [`app.sync.forceSync()`](#appsyncforcesync)
- [`app.sync.forceSyncWith(peerId)`](#appsyncforcesyncwithpeerid)
- [`app.sync.flush()`](#appsyncflush)
- [Listening to Sync Events](#listening-to-sync-events)
- [React Hook: `useSyncStatus()`](#react-hook-usesyncstatus)
- [Python SDK: Force Sync](#python-sdk-force-sync)
- [Full Example: Offline-to-Online Sync](#full-example-offline-to-online-sync)

---

## When to use Force Sync

| Scenario | Recommended API |
|---|---|
| App comes back online after being offline | `app.sync.forceSync()` |
| User clicks a "Sync now" button | `app.sync.forceSync()` |
| Sync only with a specific known peer | `app.sync.forceSyncWith(peerId)` |
| Flush all pending local changes before app close | `app.sync.flush()` |
| Monitor sync progress in the UI | `useSyncStatus()` hook |

---

## `app.sync.forceSync()`

Triggers a full CRDT sync round with **all currently connected peers**. This broadcasts your local
state vector and requests any missing updates from every peer in the room.

### Signature

```typescript
app.sync.forceSync(): Promise<void>
```

### Example

```typescript
import { createApp } from "zerithdb-sdk";

const app = createApp({
  appId: "my-app",
  sync: { signalingUrl: "wss://signal.zerithdb.dev" },
});

// Trigger a full sync round with all peers
await app.sync.forceSync();
console.log("Sync complete.");
```

### When to call it

```typescript
// Example: force sync when the browser tab regains focus
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState === "visible") {
    await app.sync.forceSync();
  }
});

// Example: force sync when the device comes back online
window.addEventListener("online", async () => {
  await app.sync.forceSync();
  console.log("Re-synced after network reconnection.");
});
```

> **Note:** `forceSync()` is a no-op if no peers are currently connected. Use
> [sync events](#listening-to-sync-events) to know when peers are available.

---

## `app.sync.forceSyncWith(peerId)`

Triggers a targeted sync round with a **single specific peer** identified by their public key
(`did:key:…`). Useful when you know exactly which peer has the data you need.

### Signature

```typescript
app.sync.forceSyncWith(peerId: string): Promise<void>
```

### Example

```typescript
// Sync with a specific peer by their public key
const targetPeer = "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK";

await app.sync.forceSyncWith(targetPeer);
console.log(`Synced with peer: ${targetPeer}`);
```

### Getting connected peer IDs

```typescript
// List all currently connected peers
const peers = app.sync.getPeers();
// Returns: [{ id: "did:key:...", latency: 42 }, ...]

for (const peer of peers) {
  console.log(peer.id, peer.latency);
}
```

---

## `app.sync.flush()`

Flushes all **pending local CRDT changes** to connected peers immediately, without waiting for the
next automatic sync tick. This is useful before closing the app or navigating away to ensure no
writes are lost.

### Signature

```typescript
app.sync.flush(): Promise<void>
```

### Example

```typescript
// Flush before the user closes the tab
window.addEventListener("beforeunload", async (e) => {
  await app.sync.flush();
});
```

### Difference between `forceSync()` and `flush()`

| | `forceSync()` | `flush()` |
|---|---|---|
| Direction | Bidirectional (push + pull) | Outbound only (push) |
| Use case | Get latest data from peers | Ensure local writes reach peers |
| Waits for peer response | Yes | No |

---

## Listening to Sync Events

ZerithDB emits events on the `app.sync` object that you can subscribe to for monitoring sync state.

```typescript
// Fires when a sync round starts
app.sync.on("sync:start", () => {
  console.log("Sync round started...");
});

// Fires when a sync round completes successfully
app.sync.on("sync:complete", ({ peersReached, duration }) => {
  console.log(`Synced with ${peersReached} peers in ${duration}ms`);
});

// Fires when sync fails (e.g., peer disconnected mid-sync)
app.sync.on("sync:error", (error) => {
  console.error("Sync failed:", error.message);
});

// Fires when a new peer connects to the room
app.sync.on("peer:connected", (peer) => {
  console.log("New peer joined:", peer.id);
});

// Fires when a peer disconnects
app.sync.on("peer:disconnected", (peer) => {
  console.log("Peer left:", peer.id);
});
```

---

## React Hook: `useSyncStatus()`

For React apps, use the built-in `useSyncStatus()` hook to reactively display sync state and
trigger manual syncs from the UI.

```tsx
import { useSyncStatus } from "zerithdb-react";

function SyncIndicator() {
  const { isSyncing, lastSyncedAt, peersConnected, forceSync } = useSyncStatus();

  return (
    <div>
      <p>Peers connected: {peersConnected}</p>
      <p>Last synced: {lastSyncedAt?.toLocaleTimeString() ?? "Never"}</p>

      <button onClick={forceSync} disabled={isSyncing}>
        {isSyncing ? "Syncing..." : "Sync Now"}
      </button>
    </div>
  );
}
```

### `useSyncStatus()` return values

| Property | Type | Description |
|---|---|---|
| `isSyncing` | `boolean` | `true` while a sync round is in progress |
| `lastSyncedAt` | `Date \| null` | Timestamp of the last successful sync |
| `peersConnected` | `number` | Number of currently connected peers |
| `forceSync` | `() => Promise<void>` | Triggers `app.sync.forceSync()` |
| `flush` | `() => Promise<void>` | Triggers `app.sync.flush()` |

---

## Python SDK: Force Sync

In the `zerithdb-python` SDK, force sync works the same way via `await`:

```python
import asyncio
from zerithdb import ZerithClient

async def main():
    client = ZerithClient("wss://zerith-signaling-523861363926.asia-south1.run.app")
    await client.connect("my-app-room-id")

    # Force a full sync round with all peers
    await client.sync.force()
    print("Sync complete.")

    # Flush local changes to peers
    await client.sync.flush()
    print("Flush complete.")

    # List connected peers
    peers = client.sync.get_peers()
    for peer in peers:
        print(f"Peer: {peer['id']} | Latency: {peer['latency']}ms")

    # Force sync with a specific peer
    await client.sync.force_with(peers[0]["id"])

asyncio.run(main())
```

### Listening to sync events in Python

```python
@client.on("sync:complete")
async def on_sync_complete(data):
    print(f"Synced with {data['peers_reached']} peers in {data['duration']}ms")

@client.on("sync:error")
async def on_sync_error(error):
    print(f"Sync error: {error['message']}")
```

---

## Full Example: Offline-to-Online Sync

A real-world pattern combining force sync, flush, and event listeners:

```typescript
import { createApp } from "zerithdb-sdk";

const app = createApp({
  appId: "my-app",
  sync: { signalingUrl: "wss://signal.zerithdb.dev" },
});

// 1. Flush pending writes before the tab closes
window.addEventListener("beforeunload", async () => {
  await app.sync.flush();
});

// 2. Force a full sync when the network comes back
window.addEventListener("online", async () => {
  console.log("Back online — triggering sync...");
  await app.sync.forceSync();
});

// 3. Force sync when a new peer joins (pull their latest data)
app.sync.on("peer:connected", async (peer) => {
  console.log(`New peer connected: ${peer.id}`);
  await app.sync.forceSyncWith(peer.id);
});

// 4. Log sync completion
app.sync.on("sync:complete", ({ peersReached, duration }) => {
  console.log(`Sync done — ${peersReached} peers, ${duration}ms`);
});
```

---

## Related

- [ZerithDB SDK README](../../sdk/README.md)
- [Architecture Deep Dive](../../../ARCHITECTURE.md)