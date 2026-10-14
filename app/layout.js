import './globals.css';

export const metadata = {
  title: 'Instagram Automation & API Flow Runner | Unipile Dashboard',
  description: 'Sequential Instagram API test automation dashboard powered by Unipile. Execute profile lookups, follow decisions, fetch posts, and send likes and comments with real-time logs.',
  keywords: ['Instagram API', 'Unipile', 'Automation', 'Flow Runner', 'Next.js', 'Vercel'],
  authors: [{ name: 'Instagram API Runner' }],
};

export const viewport = {
  themeColor: '#080B11',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
