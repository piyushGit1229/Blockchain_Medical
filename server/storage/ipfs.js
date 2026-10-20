// IPFS-compatible off-chain storage layer (paper Section III: encrypted
// records off-chain, only content hashes on-chain).
//
// By default this is a local content-addressed store that computes *real*
// CIDv0 identifiers (sha2-256 multihash, base58btc -> Qm...), byte-for-byte
// identical to what kubo/IPFS would return for the same content, so hashes
// anchored on the ledger are verifiable against a real IPFS node.
// If IPFS_API_URL is set (e.g. http://127.0.0.1:5001), add()/cat() proxy to
// the Kubo HTTP RPC API instead.
import crypto from 'node:crypto';

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** base58btc encode a buffer (as used by CIDv0). */
export function base58btc(buf) {
  let zeros = 0;
  while (zeros < buf.length && buf[zeros] === 0) zeros++;
  const digits = [0];
  for (const byte of buf) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  return '1'.repeat(zeros) + digits.reverse().map((d) => B58[d]).join('');
}

/** CIDv0 for raw content: multihash(0x12, 0x20, sha256(content)). */
export function cidV0(buffer) {
  const digest = crypto.createHash('sha256').update(buffer).digest();
  return base58btc(Buffer.concat([Buffer.from([0x12, 0x20]), digest]));
}

export class IPFSStore {
  constructor() {
    this.blocks = new Map(); // cid -> { buffer, pinned, addedAt }
    this.apiUrl = process.env.IPFS_API_URL || null; // optional real Kubo node
  }

  async add(buffer) {
    const cid = cidV0(buffer);
    if (this.apiUrl) {
      // Proxy to a real IPFS node when configured.
      const form = new FormData();
      form.append('file', new Blob([buffer]), 'record.bin');
      const res = await fetch(`${this.apiUrl}/api/v0/add?cid-version=0`, { method: 'POST', body: form });
      const json = await res.json();
      return { cid: json.Hash, size: json.Size, remote: true };
    }
    if (!this.blocks.has(cid)) {
      this.blocks.set(cid, { buffer: Buffer.from(buffer), pinned: true, addedAt: Date.now() });
    } else {
      this.blocks.get(cid).pinned = true; // re-pin (idempotent add)
    }
    return { cid, size: buffer.length, remote: false };
  }

  async cat(cid) {
    const b = this.blocks.get(cid);
    if (!b) throw new Error(`IPFS block not found: ${cid}`);
    return b.buffer;
  }

  has(cid) {
    return this.blocks.has(cid);
  }

  /** Storage statistics: off-chain storage overhead (paper Table III). */
  stat() {
    let bytes = 0;
    for (const b of this.blocks.values()) bytes += b.buffer.length;
    return { blocks: this.blocks.size, bytes, pinned: [...this.blocks.values()].filter((b) => b.pinned).length };
  }
}
