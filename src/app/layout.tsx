import type { Metadata } from 'next';
import Script from 'next/script';
import { SessionProvider } from '@/modules/context/SessionContext';
import '@/styles/index.css';

export const metadata: Metadata = {
  title: 'AssetWise Creators Club',
  description: 'มาเป็นดาวดวงใหม่ ของวงการอสังหาฯ รับค่าคอมมิชชันสูงสุด 500,000 บาท*',
  icons: {
    icon: '/creatorclub/asw-favicon.png',
    shortcut: '/creatorclub/asw-favicon.png',
    apple: '/creatorclub/asw-favicon.png',
  },
  openGraph: {
    title: 'AssetWise Creators Club',
    description: 'มาเป็นดาวดวงใหม่ ของวงการอสังหาฯ รับค่าคอมมิชชันสูงสุด 500,000 บาท*',
    images: [
      {
        url: '/creatorclub/creator-club_og.webp',
        width: 1200,
        height: 630,
        alt: 'AssetWise Creators Club',
      },
    ],
    url: 'https://assetwise.co.th/creatorclub',
    siteName: 'AssetWise Creators Club',
    locale: 'th_TH',
    type: 'website',
  },
};

const GTM_ID = 'GTM-MM872QW';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
      <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
            title="Google Tag Manager"
          />
        </noscript>
        <div id="fb-root" />
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
