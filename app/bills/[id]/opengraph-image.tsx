import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";
import { bills, getBill } from "@/content/bills";
import { SITE_NAME } from "@/lib/site";
import { woffToSfnt } from "@/lib/woff-to-sfnt";

export const dynamic = "force-static";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return bills.map((b) => ({ id: b.id }));
}

export async function generateAlt({ params }: { params: Promise<{ id: string }> }) {
  const bill = getBill((await params).id);
  return `${bill.title}｜${SITE_NAME}`;
}

// satori は同名・同weight フォントでもフォールバックしないため別名チェーン方式を採用
// 基本 19 個 + 法案タイトル・サブタイトル・バッジに必要な 11 個を追加
const SUBSET_IDS = [119, 118, 117, 116, 115, 114, 113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 99, 98, 96, 92, 91, 88, 87, 86, 83, 81];

function toAb(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function loadFonts() {
  const dir = join(process.cwd(), "node_modules/@fontsource/noto-sans-jp/files");
  return SUBSET_IDS.map((id, i) => ({
    name: `NSJ${i}`,
    data: toAb(woffToSfnt(readFileSync(join(dir, `noto-sans-jp-${id}-700-normal.woff`)))),
    weight: 700 as const,
    style: "normal" as const,
  }));
}

function loadGeist() {
  const buf = readFileSync(
    join(process.cwd(), "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf")
  );
  return { name: "Geist", data: toAb(buf), weight: 400 as const, style: "normal" as const };
}

const FONT_FAMILY = SUBSET_IDS.map((_, i) => `NSJ${i}`).join(", ") + ", Geist";

export default async function BillOgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const bill = getBill((await params).id);
  const fonts = [...loadFonts(), loadGeist()];

  const isPassedBill = bill.card.badge === "成立";
  const badgeColor = isPassedBill
    ? { bg: "#EEF0F2", text: "#525C68", border: "#D7DBE0" }
    : { bg: "#EAEEF6", text: "#28406E", border: "#C3CFE4" };

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
            padding: "52px 80px",
          }}
        >
          {/* サービス名 */}
          <p
            style={{
              fontSize: 16,
              color: "#5C5E64",
              margin: "0 0 20px",
              letterSpacing: "0.05em",
            }}
          >
            {SITE_NAME} ／ Bill Dossier
          </p>

          {/* ステータスバッジ */}
          <div style={{ display: "flex", marginBottom: 20 }}>
            <span
              style={{
                fontSize: 16,
                color: badgeColor.text,
                background: badgeColor.bg,
                border: `1px solid ${badgeColor.border}`,
                borderRadius: 4,
                padding: "3px 10px",
              }}
            >
              {bill.card.badge}
            </span>
          </div>

          {/* 法案タイトル */}
          <h1
            style={{
              fontSize: bill.title.length > 18 ? 44 : 56,
              fontWeight: 700,
              color: "#191A1C",
              margin: "0 0 16px",
              lineHeight: 1.4,
            }}
          >
            {bill.title}
          </h1>

          {/* サブタイトル */}
          {bill.subtitle && (
            <p
              style={{
                fontSize: 20,
                color: "#5C5E64",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {bill.subtitle}
            </p>
          )}
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
          <p style={{ fontSize: 14, color: "#28406E", margin: 0, fontFamily: "Geist" }}>
            houan-karte.vercel.app
          </p>
          <p style={{ fontSize: 14, color: "#5C5E64", margin: 0, fontFamily: "Geist" }}>
            {bill.statusAsOf}
          </p>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
