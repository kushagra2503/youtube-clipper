import type { Metadata } from "next";
import { Host_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { GradientBackground } from "@/components/GradientBackground";
import { Analytics } from "@vercel/analytics/next"

const font = Host_Grotesk({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuackQuery - AI Interview Assistant | Screen Reading & Audio Processing",
  description:
    "AI-powered interview assistant that sees your screen and hears your calls. Get real-time help with coding questions, behavioral interviews, and system design. Privacy-first with local processing. 🧠",
  keywords:
    "AI interview assistant, interview help, coding interview, behavioral interview, system design, screen reader AI, audio processing, interview preparation, job interview help, AI assistant, QuackQuery",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>",
    shortcut:
      "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>",
  },
  openGraph: {
    url: "https://quackquery.app/",
    type: "website",
    locale: "en_US",
    siteName: "QuackQuery",
    title: "QuackQuery - AI Interview Assistant | Get Real-time Interview Help",
    description:
      "AI interview assistant that sees your screen and hears your calls. Get instant help with coding, behavioral, and system design interviews. Privacy-first with local processing.",
    images: ["/og-image.png"],
  },
  other: {
    "twitter:image": ["/og-image.png"],
    "twitter:card": "summary_large_image",
    "twitter:url": "https://quackquery.app/",
    "twitter:domain": "quackquery.app",
    "twitter:title": "QuackQuery - AI Interview Assistant",
    "twitter:description":
      "AI interview assistant that sees your screen and hears your calls. Get real-time help with coding questions, behavioral interviews, and system design.",
    "og:url": "https://quackquery.app/",
    "og:type": "website",
    "og:title": "QuackQuery - AI Interview Assistant | Real-time Interview Help",
    "og:description":
      "AI-powered interview assistant that sees your screen and hears your calls. Get instant help with coding, behavioral, and system design interviews. Privacy-first with local processing.",
    "og:image": ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${font.className} antialiased min-h-screen`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <GradientBackground />
          {children}
          <Analytics />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
