import { blake2s as blake2s_prim } from "@noble/hashes/blake2.js";

export const FELT_PRIME: bigint = (1n << 251n) + 17n * (1n << 192n) + 1n;
export type U32 = number | bigint;
export type PubMemoryValue = [id: number, words: U32[]];

/**
 * Convert a PubMemoryValue (like [id, [u32,...,u32]]) to a 32-byte Uint8Array in little-endian order.
 * @param pmv PubMemoryValue
 * @throws Error if words length != 8
 */
export function pmvToBytesLE(pmv: PubMemoryValue): Uint8Array {
  const [, words] = pmv;
  if (!Array.isArray(words) || words.length !== 8) {
    throw new Error("Expected value to be an array of 8 u32 words");
  }

  const bytes = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    // Ensure value is converted to BigInt and mask to 32 bits
    const w = BigInt(words[i]) & 0xffffffffn;
    const off = i * 4;
    bytes[off + 0] = Number(w & 0xffn);
    bytes[off + 1] = Number((w >> 8n) & 0xffn);
    bytes[off + 2] = Number((w >> 16n) & 0xffn);
    bytes[off + 3] = Number((w >> 24n) & 0xffn);
  }
  return bytes;
}

/**
 * Convert a 32-byte Uint8Array (little-endian) into a bigint.
 * @param bytes length must be 32
 * @throws Error if bytes length !== 32
 */
export function bytesLEToBigInt(bytes: Uint8Array): bigint {
  if (!(bytes instanceof Uint8Array) || bytes.length !== 32) {
    throw new Error("Expected Uint8Array of length 32");
  }
  let bi = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    bi = (bi << 8n) | BigInt(bytes[i]);
  }
  return bi;
}

/**
 * Convert pmv to a felt BigInt. Optionally reduce modulo the felt prime.
 * Returns the bigint, validity flag, 32-byte array, and hex string.
 * @param pmv PubMemoryValue
 * @param opts PmvToFeltOptions
 */
export function pmvToFelt(
  pmv: PubMemoryValue,
  reduce: boolean = false
): bigint {
  const bytes = pmvToBytesLE(pmv);
  let felt = bytesLEToBigInt(bytes);
  const isValidFelt = felt >= 0n && felt < FELT_PRIME;
  if (!isValidFelt && reduce) {
    felt = felt % FELT_PRIME;
  }
  return felt;
}

/** Parse a hex string to a bigint and reduce modulo FELT_PRIME. */
export function hexToFelt(hex: string): bigint {
  if (typeof hex !== "string") throw new Error("hex must be a string");
  let s = hex.trim();
  if (s.length === 0) return 0n;

  let negative = false;
  if (s[0] === "+" || s[0] === "-") {
    negative = s[0] === "-";
    s = s.slice(1).trim();
    if (s.length === 0) throw new Error("invalid hex string after sign");
  }

  if (s.startsWith("0x") || s.startsWith("0X")) s = s.slice(2);
  if (s.length % 2 === 1) s = "0" + s;
  if (s.length === 0) return 0n;

  const mag = BigInt("0x" + s);
  const raw = negative ? -mag : mag;
  const reduced = ((raw % FELT_PRIME) + FELT_PRIME) % FELT_PRIME;
  return reduced;
}

/**
 * Convert a bigint into a 32-byte little-endian Uint8Array.
 * Masks the value to the low 256 bits (so result is always exactly 32 bytes).
 */
export function feltToBytes(felt: bigint): Uint8Array {
  if (typeof felt !== "bigint") {
    throw new Error("felt must be a bigint");
  }
  if (felt < 0n) {
    throw new Error("felt must be non-negative");
  }

  const bytes = new Uint8Array(32);
  // mask to low 256 bits in case felt >= 2^256
  const mask256 = (1n << 256n) - 1n;
  let v = felt & mask256;

  for (let i = 0; i < 32; i++) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

export function blake2s(bytes: Array<Uint8Array>): string {
  const hash = blake2s_prim.create();
  for (const byteArray of bytes) {
    hash.update(byteArray);
  }
  return (
    "0x" +
    Array.from(hash.digest())
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}
