/**
 * WOFF フォントファイルを sfnt (TTF/OTF) バイナリに変換する。
 * satori (Next.js ImageResponse) は WOFF を直接読めないため、ビルド時に変換して渡す。
 *
 * WOFF 仕様: https://www.w3.org/TR/WOFF/
 * - Header: 44 bytes
 * - Table Directory: numTables × 20 bytes
 * - テーブルデータ: zlib 圧縮（compLength < origLength の場合のみ）
 */
import { inflateSync } from "zlib";

export function woffToSfnt(woff: Buffer): Buffer {
  const numTables = woff.readUInt16BE(12);
  const flavor = woff.readUInt32BE(4); // 0x00010000 = TrueType, 0x4F54544F = CFF

  // WOFF テーブルディレクトリを解析（ヘッダー 44 バイトの後）
  const woffTables: Array<{
    tag: number;
    offset: number;
    compLength: number;
    origLength: number;
    checksum: number;
  }> = [];
  for (let i = 0; i < numTables; i++) {
    const base = 44 + i * 20;
    woffTables.push({
      tag: woff.readUInt32BE(base),
      offset: woff.readUInt32BE(base + 4),
      compLength: woff.readUInt32BE(base + 8),
      origLength: woff.readUInt32BE(base + 12),
      checksum: woff.readUInt32BE(base + 16),
    });
  }

  // sfnt オフセット計算（12 バイトのオフセットテーブル + 16 バイト×テーブル数）
  let dataOffset = 12 + numTables * 16;
  const entries: Array<{
    tag: number;
    checksum: number;
    offset: number;
    length: number;
    data: Buffer;
  }> = [];

  for (const t of woffTables) {
    const compressed = woff.subarray(t.offset, t.offset + t.compLength);
    const raw: Buffer =
      t.compLength < t.origLength ? inflateSync(compressed) : compressed;

    // sfnt は 4 バイト境界アライメント
    const aligned = Buffer.alloc(Math.ceil(raw.length / 4) * 4);
    raw.copy(aligned);
    entries.push({ tag: t.tag, checksum: t.checksum, offset: dataOffset, length: raw.length, data: aligned });
    dataOffset += aligned.length;
  }

  // sfnt Offset Table（12 バイト）
  const maxPow2 = Math.pow(2, Math.floor(Math.log2(numTables)));
  const offsetTable = Buffer.alloc(12);
  offsetTable.writeUInt32BE(flavor, 0);
  offsetTable.writeUInt16BE(numTables, 4);
  offsetTable.writeUInt16BE(maxPow2 * 16, 6); // searchRange
  offsetTable.writeUInt16BE(Math.floor(Math.log2(numTables)), 8); // entrySelector
  offsetTable.writeUInt16BE(numTables * 16 - maxPow2 * 16, 10); // rangeShift

  // sfnt Table Directory（16 バイト × numTables）
  const tableDir = Buffer.alloc(numTables * 16);
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    tableDir.writeUInt32BE(e.tag, i * 16);
    tableDir.writeUInt32BE(e.checksum, i * 16 + 4);
    tableDir.writeUInt32BE(e.offset, i * 16 + 8);
    tableDir.writeUInt32BE(e.length, i * 16 + 12);
  }

  return Buffer.concat([offsetTable, tableDir, ...entries.map((e) => e.data)]);
}
