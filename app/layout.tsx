import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IT3A - TRACK",
  description: "IT3A ISCS Funds Payment Tracker",
  applicationName: "IT3A - TRACK",
  formatDetection: { telephone: false },
  openGraph: {
    title: "IT3A - TRACK",
    description: "IT3A ISCS Funds Payment Tracker",
    siteName: "IT3A - TRACK",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "IT3A - TRACK",
    description: "IT3A ISCS Funds Payment Tracker",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#001514" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("it3a-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-[100dvh] bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
