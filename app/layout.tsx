import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "大杀四方 · Smash Up 卡牌档案",
  description: "按种族逐张浏览 Smash Up（大杀四方）卡牌、规则原文、数量与勘误状态。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "大杀四方 · Smash Up 卡牌档案",
    description: "106 个种族，逐张查看卡牌、数量与规则原文。",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1672,
        height: 941,
        alt: "大杀四方 Smash Up 卡牌档案",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "大杀四方 · Smash Up 卡牌档案",
    description: "106 个种族，逐张查看卡牌、数量与规则原文。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
