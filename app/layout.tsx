import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Celebra — Gather everyone you love", template: "%s · Celebra" },
  description: "A beautiful website for your celebration, personal RSVPs for every household, WhatsApp and email invitations, and one calm dashboard for it all.",
};

export const viewport: Viewport = { themeColor: "#2e1f3a" };

// Brand fonts (Bricolage Grotesque, Figtree) plus the public-site theme fonts (lib/site/themes.ts).
const FONTS =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Figtree:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&family=Playfair+Display:wght@400;600&display=swap";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
