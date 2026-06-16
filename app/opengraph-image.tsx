import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { SITE_NAME } from "@/lib/site";
import { woffToSfnt } from "@/lib/woff-to-sfnt";

export const dynamic = "force-static";
export const alt = `${SITE_NAME} — 重要法案を一次情報で中立に`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 法案カルテで表示する文字を網羅する fontsource サブセット（降順）
// 基本 19 個 + 法案タイトル・サブタイトル・バッジに必要な 11 個を追加
const SUBSET_IDS = [119, 118, 117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 99, 98, 96, 92, 91, 88, 87, 86, 83, 81];

function toAb(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

// satori は同名・同weight フォントでもフォールバックしないため、
// 各サブセットに連番の別名をつけて CSS fontFamily で全体をチェーンする
function loadFonts() {
  const dir = join(process.cwd(), "node_modules/@fontsource/noto-sans-jp/files");
  return SUBSET_IDS.map((id, i) => ({
    name: `NSJ${i}`,
    data: toAb(woffToSfnt(readFileSync(join(dir, `noto-sans-jp-${id}-700-normal.woff`)))),
    weight: 700 as const,
    style: "normal" as const,
  }));
}

// フォントの英字用に Geist を追加
function loadGeist() {
  const buf = readFileSync(
    join(process.cwd(), "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf")
  );
  return { name: "Geist", data: toAb(buf), weight: 400 as const, style: "normal" as const };
}

const FONT_FAMILY = SUBSET_IDS.map((_, i) => `NSJ${i}`).join(", ") + ", Geist";

export default function OgImage() {
  const fonts = [...loadFonts(), loadGeist()];

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          background: "#FBFAF6",
          fontFamily: FONT_FAMILY,
        }}
      >
        {/* 上部アクセントバー */}
        <div style={{ width: "100%", height: 8, background: "#28406E" }} />

        {/* メインコンテンツ */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 80px",
          }}
        >
          <p
            style={{
              fontSize: 18,
              color: "#5C5E64",
              margin: "0 0 16px",
              letterSpacing: "0.1em",
              fontFamily: "Geist",
            }}
          >
            Bill Dossier
          </p>
          <h1
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "#191A1C",
              margin: "0 0 28px",
              lineHeight: 1.15,
            }}
          >
            {SITE_NAME}
          </h1>
          <p
            style={{
              fontSize: 24,
              color: "#5C5E64",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            重要な国会法案を一次情報で中立に整理
          </p>
        </div>

        {/* フッター */}
        <div
          style={{
            padding: "0 80px 44px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p style={{ fontSize: 15, color: "#28406E", margin: 0, fontFamily: "Geist" }}>
            houan-karte.vercel.app
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: "#28406E" }} />
            <p style={{ fontSize: 15, color: "#28406E", margin: 0, fontFamily: "Geist" }}>
              PROTOTYPE
            </p>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
