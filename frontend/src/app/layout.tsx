import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Polyfill Promise.withResolvers for Node.js < 22 and PDF.js v4+
if (typeof Promise.withResolvers === "undefined") {
  (Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "EKA — Enterprise Knowledge Assistant",
  description:
    "AP/Finance workflow automation powered by Google AI. Policy retrieval, invoice processing, and AAL-3 governance — all in one platform.",
  keywords: ["AP Finance", "Invoice Processing", "Enterprise AI", "Document AI", "Policy Assistant"],
  authors: [{ name: "EKA Platform" }],
  robots: "noindex, nofollow", // Internal enterprise tool
  openGraph: {
    title: "EKA — Enterprise Knowledge Assistant",
    description: "AP/Finance AI workflow automation with AAL-3 governance",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
