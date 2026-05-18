# ZerithDB Signaling Edge

Ultra-low latency signaling server for ZerithDB, designed to run on the Edge (Cloudflare Workers,
Vercel Edge).

## Overview

WebRTC requires a signaling server to exchange connection information (offers, answers, ICE
candidates) between peers. This package provides a platform-agnostic signaling core and adapters for
modern edge runtimes, ensuring that peers connect to the nearest possible server.

## Features

- **Platform Agnostic**: Core logic in `handler.ts` uses only standard Web APIs.
- **Cloudflare Workers**: Utilizes Durable Objects for stateful, room-based signaling with global
  low latency.
- **Vercel Edge**: Support for Vercel Edge Runtime.
- **Room Isolation**: Each `roomId` is isolated, ensuring messages only reach relevant peers.

## Deployment

### Cloudflare Workers

1.  **Install Wrangler**:

    ```bash
    npm install -g wrangler
    ```

2.  **Deploy**:

    ```bash
    wrangler deploy
    ```

3.  **Configure ZerithDB SDK**: Set your signaling URL to
    `https://your-worker.your-subdomain.workers.dev?roomId=YOUR_ROOM&peerId=YOUR_PEER`.

### Vercel Edge

1.  **Deploy**:

    ```bash
    vercel deploy
    ```

2.  **Configure ZerithDB SDK**: Set your signaling URL to
    `https://your-project.vercel.app/api/signaling?roomId=YOUR_ROOM&peerId=YOUR_PEER`.

## Architecture

The signaling server uses a "Matchmaker" pattern:

1.  **Join**: Peer A connects to a room.
2.  **Discovery**: Peer A receives a list of existing peers in the room.
3.  **Relay**: Peers exchange WebRTC signals through the server.
4.  **P2P**: Once the connection is established, the server is no longer involved in the data
    transfer.

On Cloudflare, **Durable Objects** are used to ensure that all peers in the same room are routed to
the same stateful instance, regardless of which data center they connect to.
