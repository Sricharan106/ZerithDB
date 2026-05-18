import { describe, it, expect } from "vitest";
import { split, combine } from "./sss.js";

describe("Shamir's Secret Sharing", () => {
  it("should split and combine a secret correctly", () => {
    const secret = new Uint8Array([1, 2, 3, 4, 5, 42, 255]);
    const threshold = 3;
    const total = 5;

    const shares = split(secret, threshold, total);
    expect(shares.length).toBe(total);

    // Try with threshold shares
    const recovered = combine(shares.slice(0, threshold));
    expect(recovered).toEqual(secret);

    // Try with all shares
    const recoveredAll = combine(shares);
    expect(recoveredAll).toEqual(secret);
  });

  it("should fail to recover with fewer than threshold shares", () => {
    // Mock Math.random to ensure non-zero coefficients (avoids flakiness)
    const originalRandom = Math.random;
    Math.random = () => 0.5; // 0.5 * 256 = 128

    try {
      const secret = new Uint8Array([1, 2, 3]);
      const threshold = 3;
      const total = 5;

      const shares = split(secret, threshold, total);

      // With 2 shares, it should NOT recover the secret
      const recovered = combine(shares.slice(0, threshold - 1));
      expect(recovered).not.toEqual(secret);
    } finally {
      Math.random = originalRandom;
    }
  });

  it("should work with different thresholds", () => {
    const secret = new Uint8Array([10, 20, 30]);
    const threshold = 2;
    const total = 10;

    const shares = split(secret, threshold, total);
    const recovered = combine([shares[0], shares[9]]);
    expect(recovered).toEqual(secret);
  });
});
