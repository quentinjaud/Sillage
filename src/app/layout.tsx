import type { Metadata } from "next";
import localFont from "next/font/local";
import { MantineWrapper } from "@/components/MantineProvider";
import { Footer } from "@/components/Footer";
import { ColorSchemeScript } from "@mantine/core";
import "./globals.css";

const atkinson = localFont({
  src: [
    {
      path: "../fonts/atkinson-400.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/atkinson-700.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: "Navimeter",
  description: "Analyse de traces de navigation à voile",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={atkinson.variable}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineWrapper>
          <header className="app-header">
            <a href="/" className="app-header-title">
              Navimeter
            </a>
            <span className="app-header-subtitle">Analyse de navigation</span>
          </header>
          <main className="app-main">{children}</main>
          <Footer />
        </MantineWrapper>
      </body>
    </html>
  );
}
