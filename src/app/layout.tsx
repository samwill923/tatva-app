import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari } from "next/font/google";
import { SwRegister } from "@/components/SwRegister";
import { LanguageProvider } from "@/lib/i18n";
import "./globals.css";

const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin"] });
const notoDeva = Noto_Sans_Devanagari({ variable: "--font-noto-deva", subsets: ["devanagari"] });

export const metadata: Metadata = {
  title: "Tatva · Prescription Scanner",
  description: "Scan a handwritten prescription and understand your medicines, diet and lifestyle.",
  applicationName: "Tatva",
  appleWebApp: { capable: true, title: "Tatva", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#4A5D23",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${notoSans.variable} ${notoDeva.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <LanguageProvider>{children}</LanguageProvider>
        <SwRegister />
      </body>
    </html>
  );
}
