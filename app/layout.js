import './globals.css';

export const metadata = {
  title: 'CrowdFuel — クラファン先行登録 & 支援創出エンジン',
  description: 'LP自動生成・広告管理・ナーチャリングを一気通貫で',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&family=Outfit:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
