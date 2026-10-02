import type { Metadata } from "next";
import { Big_Shoulders, Courier_Prime, Albert_Sans } from "next/font/google";
import "./globals.css";

const display = Big_Shoulders({ variable: "--font-display", subsets: ["latin"], weight: ["600", "800", "900"] });
const script = Courier_Prime({ variable: "--font-script", subsets: ["latin"], weight: ["400", "700"] });
const body = Albert_Sans({ variable: "--font-body", subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Reelwright · AI Movie Generator",
  description: "Turn a story idea into a script, a timed shot list, clips, and one MP4, using free and offline-first tools.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${script.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
