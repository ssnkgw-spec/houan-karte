import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap" style={{ padding: "80px 22px" }}>
      <p className="eyebrow">404 — NOT FOUND</p>
      <h1 className="serif" style={{ fontSize: 32 }}>
        ページが見つかりません
      </h1>
      <p>
        URLが変わったか、ページが存在しません。法案カルテの一覧はトップにあります。
      </p>
      <p>
        <Link href="/">← トップ（法案一覧）へ</Link>
      </p>
    </main>
  );
}
