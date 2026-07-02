import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mercury · 商务英语进阶",
  description:
    "为中文母语职场人打造的英语提升平台：托业 / 雅思备考 + 实战商务英语",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
