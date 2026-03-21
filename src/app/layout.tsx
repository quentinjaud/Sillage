import type { Metadata } from "next";
import localFont from "next/font/local";
import { MantineWrapper } from "@/components/MantineProvider";
import { MenuUtilisateur } from "@/components/MenuUtilisateur";
import { Footer } from "@/components/Footer";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import "./globals.css";

const atkinson = localFont({
  src: "../fonts/atkinson-variable.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: "Navimeter",
  description: "Journal de navigation et analyse de performance à la voile",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={atkinson.variable} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="light" />
      </head>
      <body>
        <MantineWrapper>
          <header className="app-header">
            <a href="/" className="app-header-title">
              Navimeter
            </a>
            <MenuUtilisateur />
          </header>
          <main className="app-main">{children}</main>
          <Footer />
        </MantineWrapper>
      </body>
    </html>
  );
}
