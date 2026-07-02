import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mercury · 商务英语进阶",
  description:
    "为中文母语职场人打造的英语提升平台：托业 / 雅思备考 + 实战商务英语",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale === "zh" ? "zh-CN" : "en"}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
