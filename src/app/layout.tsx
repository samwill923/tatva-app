import type { Metadata, Viewport } from "next";
import { Manrope, Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { SwRegister } from "@/components/SwRegister";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin"] });
const notoDeva = Noto_Sans_Devanagari({ variable: "--font-noto-deva", subsets: ["devanagari"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "Tatva · Prescription Scanner",
  description: "Scan a handwritten prescription and understand your medicines, diet and lifestyle.",
  applicationName: "Tatva",
  appleWebApp: { capable: true, title: "Tatva", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#F5F3EE",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${notoSans.variable} ${notoDeva.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <LanguageProvider>{children}</LanguageProvider>
        <SwRegister />
      </body>
    </html>
  );
}
