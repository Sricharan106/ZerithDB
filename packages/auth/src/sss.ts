/**
 * Shamir's Secret Sharing over GF(2^8)
 *
 * This is used for Social Recovery of identities.
 * Each byte of the secret is shared using a polynomial of degree (threshold - 1).
 */

// GF(2^8) tables
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGF256() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // x^8 + x^4 + x^3 + x^2 + 1
  }
  for (let i = 255; i < 512; i++) {
    GF256_EXP[i] = GF256_EXP[i - 255];
  }
})();

function gfAdd(a: number, b: number): number {
  return a ^ b;
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[GF256_LOG[a] + GF256_LOG[b]];
}

function gfDiv(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero in GF256");
  if (a === 0) return 0;
  return GF256_EXP[GF256_LOG[a] + 255 - GF256_LOG[b]];
}

/**
 * Evaluates a polynomial at x.
 * poly[0] is the constant term (the secret byte).
 */
function evaluatePolynomial(poly: Uint8Array, x: number): number {
  if (x === 0) return poly[0];
  let result = poly[poly.length - 1];
  for (let i = poly.length - 2; i >= 0; i--) {
    result = gfAdd(gfMul(result, x), poly[i]);
  }
  return result;
}

/**
 * Splits a secret (Uint8Array) into N shares with a threshold T.
 * Returns an array of shares, where each share is [x, y1, y2, ..., yM].
 */
export function split(secret: Uint8Array, threshold: number, total: number): Uint8Array[] {
  if (threshold > total) throw new Error("Threshold cannot be greater than total");
  if (threshold < 2) throw new Error("Threshold must be at least 2");
  if (total > 255) throw new Error("Total shares cannot exceed 255");
  if (threshold > 255) throw new Error("Threshold cannot exceed 255");

  const shares: Uint8Array[] = [];
  for (let i = 0; i < total; i++) {
    shares[i] = new Uint8Array(secret.length + 1);
    shares[i][0] = i + 1; // x coordinate
  }

  for (let i = 0; i < secret.length; i++) {
    const poly = new Uint8Array(threshold);
    poly[0] = secret[i];
    for (let j = 1; j < threshold; j++) {
      poly[j] = Math.floor(Math.random() * 256);
    }

    for (let j = 0; j < total; j++) {
      shares[j][i + 1] = evaluatePolynomial(poly, shares[j][0]);
    }
  }

  return shares;
}

/**
 * Combines shares to recover the secret.
 * Each share must be a Uint8Array where share[0] is the x-coordinate.
 */
export function combine(shares: Uint8Array[]): Uint8Array {
  if (shares.length === 0) throw new Error("No shares provided");
  const secretLength = shares[0].length - 1;
  const secret = new Uint8Array(secretLength);

  for (let k = 0; k < secretLength; k++) {
    let result = 0;
    for (let i = 0; i < shares.length; i++) {
      let li = 1;
      for (let j = 0; j < shares.length; j++) {
        if (i === j) continue;
        const num = shares[j][0];
        const den = gfAdd(shares[i][0], shares[j][0]);
        li = gfMul(li, gfDiv(num, den));
      }
      result = gfAdd(result, gfMul(shares[i][k + 1], li));
    }
    secret[k] = result;
  }

  return secret;
}
