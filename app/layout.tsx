import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Celebra — websites and planning for weddings and events",
  description: "Create your event website and manage guests, RSVPs, messages and seating in one place.",
};

// Fonts for the dashboard and every public-site theme (lib/site/themes.ts).
const FONTS =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&family=Playfair+Display:wght@400;600&display=swap";

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
