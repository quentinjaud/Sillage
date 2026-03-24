import type { Metadata } from "next";
import localFont from "next/font/local";
import { MantineWrapper } from "@/components/MantineProvider";
import { MenuUtilisateur } from "@/components/MenuUtilisateur";
import { BoutonAccueil } from "@/components/BoutonAccueil";
import { BandeauImpersonation } from "@/components/BandeauImpersonation";
import { PanneauProvider } from "@/lib/contexts/PanneauContext";
import PanneauFlottantRendu from "@/components/Panneaux/PanneauFlottantRendu";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import "./globals.css";

const atkinson = localFont({
  src: "../fonts/atkinson-variable.woff2",
  weight: "200 800",
  style: "normal",
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: "Sillage",
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
          <PanneauProvider>
            <BandeauImpersonation />
            <BoutonAccueil />
            <MenuUtilisateur />
            <PanneauFlottantRendu />
            {children}
          </PanneauProvider>
        </MantineWrapper>
      </body>
    </html>
  );
}
