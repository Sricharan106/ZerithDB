import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import type { ZerithDBConfig, Identity, Signature } from "zerithdb-core";
import { ZerithDBError, ErrorCode, EventEmitter } from "zerithdb-core";
import { timingSafeEqual } from "./timing-safe.js";
import { splitSecret, recoverSecret } from "zerithdb-wasm-crypto";
import { UCAN, Capability, DelegateOptions, signUCAN, verifyUCAN, verifyDelegationChain, extractCapabilities } from './capability/index.js';

interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const memoryStorage = new Map<string, string>();

function resolveStorage(): KeyValueStorage {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
    // Ignore environments where localStorage exists but is inaccessible.
  }

  return {
    getItem(key: string): string | null {
      return memoryStorage.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      memoryStorage.set(key, value);
    },
    removeItem(key: string): void {
      memoryStorage.delete(key);
    },
  };
}

// noble/ed25519 requires a sha512 implementation
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

type AuthEvents = {
  "identity:change": Identity | null;
};

/**
 * Manages the local Ed25519 keypair identity for this ZerithDB instance.
 * Identities are stored in localStorage as hex-encoded keys.
 * No servers involved — identity is fully self-sovereign.
 */
export class AuthManager extends EventEmitter<AuthEvents> {
  private readonly storageKey: string;
  private readonly storage: KeyValueStorage;
  private _identity: Identity | null = null;
  private privateKeyBytes: Uint8Array | null = null;
  public readonly biometric = new BiometricKeyManager();

  constructor(config: ZerithDBConfig) {
    super();
    this.storageKey = config.auth?.storageKey ?? "__zerithdb_identity";
    this.storage = resolveStorage();
  }

  /**
   * Sign in to ZerithDB.
   * - If a keypair already exists in localStorage, it is loaded.
   * - If not, a new Ed25519 keypair is generated and stored.
   *
   * @returns The current {@link Identity}
   */
  async signIn(): Promise<Identity> {
    if (this._identity !== null) return this._identity;

    const stored = this.loadFromStorage();
    if (stored !== null) {
      this._identity = stored.identity;
      this.privateKeyBytes = stored.privateKeyBytes;
      this.emit("identity:change", this._identity);
      return this._identity;
    }

    return this.generateIdentity();
  }

  /**
   * Generate a brand-new identity, replacing any existing one.
   * ⚠️ This is destructive — the old identity cannot be recovered.
   */
  async generateIdentity(): Promise<Identity> {
    const privateKey = ed.utils.randomPrivateKey();
    const publicKeyBytes = await ed.getPublicKeyAsync(privateKey);

    const identity = this.buildIdentity(publicKeyBytes);
    this._identity = identity;
    this.privateKeyBytes = privateKey;

    this.saveToStorage(privateKey, publicKeyBytes);
    this.emit("identity:change", identity);
    return identity;
  }

  /**
   * Sign arbitrary bytes with the local private key.
   * Used to authenticate sync updates sent to peers.
   */
  async sign(data: Uint8Array): Promise<Signature> {
    if (this.privateKeyBytes === null) {
      throw new ZerithDBError(
        ErrorCode.AUTH_KEY_NOT_FOUND,
        "No identity loaded. Call auth.signIn() first."
      );
    }

    try {
      const sig = await ed.signAsync(data, this.privateKeyBytes);
      return bytesToHex(sig);
    } catch (err) {
      throw new ZerithDBError(ErrorCode.AUTH_SIGN_FAILED, "Failed to sign data", {
        cause: err,
      });
    }
  }

  /**
   * Verify a signature against a public key.
   *
   * @param data - The original data that was signed
   * @param signature - Hex-encoded signature
   * @param publicKey - Hex-encoded Ed25519 public key
   */
  async verify(data: Uint8Array, signature: Signature, publicKey: string): Promise<boolean> {
    try {
      return await ed.verifyAsync(hexToBytes(signature), data, hexToBytes(publicKey));
    } catch {
      return false;
    }
  }

  /**
   * Securely compares two authentication token challenges in constant time.
   * Mitigates potential timing attacks against the P2P cluster syncing auth protocols.
   * Highly critical for distributed network synchronization.
   */
  verifyPeerChallenge(expected: string, received: string): boolean {
    try {
      const expectedBytes = hexToBytes(expected);
      const receivedBytes = hexToBytes(received);
      return timingSafeEqual(expectedBytes, receivedBytes);
    } catch {
      return false;
    }
  }

  /**
   * Generate recovery shards for the current identity's private key
   * using Shamir's Secret Sharing.
   */
  async generateRecoveryShards(threshold: number, total: number): Promise<string[]> {
    if (this.privateKeyBytes === null) {
      throw new ZerithDBError(
        ErrorCode.AUTH_KEY_NOT_FOUND,
        "No identity loaded. Call auth.signIn() first."
      );
    }

    const { splitSecret } = await import("zerithdb-wasm-crypto");
    return await splitSecret(this.privateKeyBytes, threshold, total);
  }

  /**
   * Reconstruct the private key identity from a set of recovery shards
   * and sign in with the reconstructed key.
   */
  async recoverIdentity(shards: string[]): Promise<Identity> {
    const { recoverSecret } = await import("zerithdb-wasm-crypto");

    try {
      const privateKeyBytes = await recoverSecret(shards);
      const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

      const identity = this.buildIdentity(publicKeyBytes);
      this._identity = identity;
      this.privateKeyBytes = privateKeyBytes;

      this.saveToStorage(privateKeyBytes, publicKeyBytes);
      this.emit("identity:change", identity);
      return identity;
    } catch (err) {
      throw new ZerithDBError(
        ErrorCode.AUTH_VERIFY_FAILED,
        "Failed to recover identity from shards. Check that the shards are correct and the threshold is met.",
        { cause: err }
      );
    }
  }

  /** The currently loaded identity, or null if not signed in */
  get identity(): Identity | null {
    return this._identity;
  }

  /** Sign out and clear the stored identity */
  signOut(): void {
    if (this._identity !== null) {
      this._identity = null;
      this.privateKeyBytes = null;
      try {
        this.storage.removeItem(this.storageKey);
      } catch {
        // localStorage may not be available in all environments
      }
      this.emit("identity:change", null);
    }
  }

  /**
   * Generate Shamir's Secret Sharing shards from the current identity's private key.
   * Generate recovery shards for the current master identity private key using Shamir's Secret Sharing.  [KEPT BOTH COMMENTS]
   */
  async generateRecoveryShards(threshold: number, total: number): Promise<string[]> {
    if (this.privateKeyBytes === null) {
      throw new ZerithDBError(
        ErrorCode.AUTH_KEY_NOT_FOUND,
        "No identity loaded. Call auth.signIn() before generating shards."
      );
    }

    const { splitSecret } = await import("zerithdb-wasm-crypto");
    return splitSecret(this.privateKeyBytes, threshold, total);
  }

  /**
   * Recover and load an identity using Shamir's Secret Sharing shards.
   */
  async recoverIdentity(shards: string[]): Promise<Identity> {
    try {
      const { recoverSecret } = await import("zerithdb-wasm-crypto");
      const privateKeyBytes = await recoverSecret(shards);

      const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
      const identity = this.buildIdentity(publicKeyBytes);

      this._identity = identity;
      this.privateKeyBytes = privateKeyBytes;

      this.saveToStorage(privateKeyBytes, publicKeyBytes);
      this.emit("identity:change", identity);
      return identity;
    } catch (err) {
      throw new ZerithDBError(
        ErrorCode.AUTH_VERIFY_FAILED,
        "Failed to recover identity. Invalid shards or insufficient threshold.",
        { cause: err }
      );
    }
  }

  /**
   * Generate recovery shares for the current identity.
   * Uses Shamir's Secret Sharing to split the private key.
   *
   * @param threshold - Minimum number of shares required to recover
   * @param total - Total number of shares to generate
   * @returns Hex-encoded recovery shares
   */
  async generateRecoveryShares(threshold: number, total: number): Promise<string[]> {
    if (this.privateKeyBytes === null) {
      throw new ZerithDBError(ErrorCode.AUTH_KEY_NOT_FOUND, "No identity loaded.");
    }

    try {
      const { split } = await import("./sss.js");
      const shares = split(this.privateKeyBytes, threshold, total);
      return shares.map((s) => bytesToHex(s));
    } catch (err: any) {
      throw new ZerithDBError(ErrorCode.AUTH_INVALID_SHARES, err.message, { cause: err });
    }
  }

  /**
   * Recover an identity from social recovery shares.
   * If successful, the recovered identity is loaded and saved.
   *
   * @param shares - Hex-encoded recovery shares
   */
  async recoverFromShares(shares: string[]): Promise<Identity> {
    if (shares.length < 2) {
      throw new ZerithDBError(ErrorCode.AUTH_INVALID_SHARES, "At least 2 shares are required.");
    }

    try {
      const { combine } = await import("./sss.js");
      const shareBytes = shares.map((s) => hexToBytes(s));
      const privateKey = combine(shareBytes);
      const publicKeyBytes = await ed.getPublicKeyAsync(privateKey);

      const identity = this.buildIdentity(publicKeyBytes);
      this._identity = identity;
      this.privateKeyBytes = privateKey;

      this.saveToStorage(privateKey, publicKeyBytes);
      return identity;
    } catch (err) {
      throw new ZerithDBError(
        ErrorCode.AUTH_RECOVERY_FAILED,
        "Failed to recover identity from shares",
        {
          cause: err,
        }
      );
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private buildIdentity(publicKeyBytes: Uint8Array): Identity {
    const publicKey = bytesToHex(publicKeyBytes);
    // Simplified DID:key — in production use proper multibase encoding
    const did = `did:key:z${publicKey}`;
    return { did, publicKey, createdAt: Date.now() };
  }

  private saveToStorage(privateKey: Uint8Array, publicKey: Uint8Array): void {
    try {
      this.storage.setItem(
        this.storageKey,
        JSON.stringify({
          privateKey: bytesToHex(privateKey),
          publicKey: bytesToHex(publicKey),
          createdAt: Date.now(),
        })
      );
    } catch {
      // localStorage quota exceeded or unavailable — identity lives only in memory
    }
  }

  private loadFromStorage(): {
    identity: Identity;
    privateKeyBytes: Uint8Array;
  } | null {
    try {
      const raw = this.storage.getItem(this.storageKey);
      if (raw === null) return null;

      const parsed = JSON.parse(raw) as {
        privateKey: string;
        publicKey: string;
        createdAt: number;
      };

      const publicKeyBytes = hexToBytes(parsed.publicKey);
      const identity = this.buildIdentity(publicKeyBytes);
      identity.createdAt = parsed.createdAt;

      return { identity, privateKeyBytes: hexToBytes(parsed.privateKey) };
    } catch {
      return null;
    }
  }

  /**
   * Returns the current identity's private key and DID.
   * @throws if not signed in.
   */
  private async getIdentity(): Promise<{ privateKey: Uint8Array; publicKeyDid: string }> {
    if (!this._identity || !this.privateKeyBytes) {
      throw new ZerithDBError(
        ErrorCode.AUTH_KEY_NOT_FOUND,
        "No identity loaded. Call auth.signIn() first."
      );
    }
    return {
      privateKey: this.privateKeyBytes,
      publicKeyDid: this._identity.did,
    };
  }

  /**
   * Delegate capabilities to another peer (DID).
   * @param targetDid The DID of the delegatee.
   * @param capabilities Array of capabilities to grant.
   * @param options Expiration, proof chain.
   * @returns A signed UCAN.
   */
  async delegate(
    targetDid: string,
    capabilities: Capability[],
    options: DelegateOptions = {}
  ): Promise<UCAN> {
    const identity = await this.getIdentity();
    const expiresIn = options.expiresIn ?? 3600;
    const exp = Math.floor(Date.now() / 1000) + expiresIn;

    const ucan: Omit<UCAN, 'sig'> = {
      iss: identity.publicKeyDid,
      aud: targetDid,
      att: capabilities,
      exp,
      prf: options.proof,
    };
    return await signUCAN(ucan, identity.privateKey);
  }

  /**
   * Verify a received UCAN and optionally check its chain against a trust root.
   * @param ucan The UCAN to verify.
   * @param expectedAudience If provided, must match UCAN's `aud`.
   * @param trustRoot Optional DID that must be at the root of the delegation chain.
   * @returns True if valid.
   */
  async verifyUCAN(
    ucan: UCAN,
    expectedAudience?: string,
    trustRoot?: string
  ): Promise<boolean> {
    if (trustRoot) {
      return await verifyDelegationChain(ucan, trustRoot);
    }
    return await verifyUCAN(ucan, expectedAudience);
  }

  /**
   * Extract capabilities from a verified UCAN.
   */
  getCapabilities(ucan: UCAN): Capability[] {
    return extractCapabilities(ucan);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  if (typeof hex !== "string" || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new ZerithDBError(
      ErrorCode.AUTH_VERIFY_FAILED,
      `hexToBytes() received an invalid hex string: "${hex}".`
    );
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}