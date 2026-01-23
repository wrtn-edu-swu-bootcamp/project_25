import "./globals.css";
import { Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-sans",
});

const notoSerifKR = Noto_Serif_KR({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-noto-serif",
});

export const metadata = {
  title: "HOLD ON",
  description: "잠깐, 다시 읽어보세요 - AI가 아닌 당신이 판단합니다",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${notoSerifKR.variable}`}>
      <body>{children}</body>
    </html>
  );
}
