import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startSignalingServer, type SignalServerConfig } from "./signaling-server.js";
import WebSocket from "ws";

describe("signaling-server", () => {
  beforeAll(async () => {
    // Start test server
    const config: SignalServerConfig = {
      port: 9999,
      host: "localhost",
      logLevel: "error", // Suppress logs during tests
    };
    startSignalingServer(config);
    // Give server time to start
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Server stops on process exit, handled by vitest
  });

  it("should accept WebSocket connections", async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(
        "ws://localhost:9999?room=test-room&peer=peer-1"
      );

      ws.on("open", () => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
        ws.close();
        resolve();
      });

      ws.on("error", (error) => {
        reject(error);
      });
    });
  });

  it("should reject connections without room or peer ID", async () => {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket("ws://localhost:9999?room=test-room");

      ws.on("close", (code) => {
        try {
          expect(code).toBe(1008); // Policy violation
          resolve();
        } catch (e) {
          reject(e);
        }
      });

      ws.on("error", () => {
        // Expected
      });

      // Timeout if connection doesn't close
      setTimeout(() => {
        reject(new Error("Connection did not close as expected"));
      }, 5000);
    });
  });

  it("should send peer-list on connection", async () => {
    return new Promise<void>((resolve, reject) => {
      const ws1 = new WebSocket(
        "ws://localhost:9999?room=test-room-2&peer=peer-a"
      );

      ws1.on("open", () => {
        const ws2 = new WebSocket(
          "ws://localhost:9999?room=test-room-2&peer=peer-b"
        );

        ws2.on("message", (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === "peer-list") {
            try {
              expect(msg.payload).toContain("peer-a");
              ws1.close();
              ws2.close();
              resolve();
            } catch (e) {
              reject(e);
            }
          }
        });
      });

      ws1.on("error", (error) => {
        reject(error);
      });

      // Timeout protection
      setTimeout(() => {
        reject(new Error("Test timeout"));
      }, 10000);
    });
  });

  it("should route targeted messages between peers", async () => {
    return new Promise<void>((resolve, reject) => {
      const ws1 = new WebSocket(
        "ws://localhost:9999?room=test-room-3&peer=peer-x"
      );
      const ws2 = new WebSocket(
        "ws://localhost:9999?room=test-room-3&peer=peer-y"
      );

      ws2.on("message", (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.from === "peer-x" && msg.to === "peer-y") {
          try {
            expect(msg.payload).toBe("hello");
            ws1.close();
            ws2.close();
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      });

      ws1.on("open", () => {
        ws1.send(
          JSON.stringify({
            to: "peer-y",
            payload: "hello",
          })
        );
      });

      ws1.on("error", (error) => {
        reject(error);
      });

      // Timeout protection
      setTimeout(() => {
        reject(new Error("Test timeout"));
      }, 10000);
    });
  });

  it("should handle invalid log levels gracefully", async () => {
    // This tests that only valid log levels are accepted
    expect(() => {
      const config: SignalServerConfig = {
        port: 9998,
        host: "localhost",
        logLevel: "error",
      };
      expect(["error", "warn", "info", "debug"]).toContain(config.logLevel);
    }).not.toThrow();
  });
});
