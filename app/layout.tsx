import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "./nav";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Date Night Roulette",
  description: "Spin to decide where we're eating tonight.",
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // iOS ignores SVG touch icons — this must stay a raster.
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    // Lets the dark background run up under the clock; see the safe-area-inset-top
    // rule in globals.css, which keeps content clear of the notch.
    statusBarStyle: "black-translucent",
    // iOS elides the home-screen label at ~12 characters.
    title: "Date Night",
  },
};

export const viewport: Viewport = {
  themeColor: "#130e1f",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <div id="app-root" className="min-h-dvh flex flex-col">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
