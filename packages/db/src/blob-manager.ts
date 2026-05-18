import { ZerithDBError, ErrorCode } from "zerithdb-core";

export interface BlobConfig {
  ipfsRpcUrl?: string;
  ipfsGatewayUrl?: string;
}

/**
 * Manages large binary objects (Blobs) by offloading them to IPFS/Filecoin.
 * Returns CIDs that can be stored in document fields.
 */
export class BlobManager {
  private readonly rpcUrl: string;
  private readonly gatewayUrl: string;

  constructor(config: BlobConfig = {}) {
    this.rpcUrl = config.ipfsRpcUrl ?? "https://ipfs.infura.io:5001/api/v0";
    this.gatewayUrl = config.ipfsGatewayUrl ?? "https://ipfs.io/ipfs/";
  }

  /**
   * Upload a Blob or Uint8Array to IPFS.
   * Returns the Content Identifier (CID).
   */
  async upload(data: Blob | Uint8Array): Promise<string> {
    try {
      const formData = new FormData();
      const blob = data instanceof Uint8Array ? new Blob([data]) : data;
      formData.append("file", blob);

      const response = await fetch(`${this.rpcUrl}/add`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`IPFS RPC returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result.Hash; // CID v0/v1
    } catch (err) {
      throw new ZerithDBError(ErrorCode.DB_IPFS_UPLOAD_FAILED, "Failed to upload blob to IPFS", {
        cause: err,
      });
    }
  }

  /**
   * Download a blob from IPFS using its CID.
   */
  async download(cid: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.gatewayUrl}${cid}`);
      if (!response.ok) {
        throw new Error(`IPFS Gateway returned ${response.status}: ${response.statusText}`);
      }
      return await response.blob();
    } catch (err) {
      throw new ZerithDBError(
        ErrorCode.DB_READ_FAILED,
        `Failed to download blob with CID "${cid}" from IPFS`,
        { cause: err }
      );
    }
  }

  /**
   * Helper to get a public URL for a CID.
   */
  getUrl(cid: string): string {
    return `${this.gatewayUrl}${cid}`;
  }
}
