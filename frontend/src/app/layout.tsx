import "./globals.css";

export const metadata = {
  title: "뉴스 리터러시 플랫폼",
  description: "2030세대를 위한 AI 뉴스 분석 서비스",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
