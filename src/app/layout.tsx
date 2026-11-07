import type { Metadata } from "next";
import "./globals.css";

function getMetadataBaseUrl(): URL {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL);
    } catch {
      // fallback below
    }
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3005");
}

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: "Rate My Patakha 🧨 | Cracker Cards, Photo/Rangoli Frames & 1v1 Battles",
  description:
    "Enter your username, frame your Photo or Rangoli in handcrafted Diwali frames, or tag a friend in a custom-hour 1v1 Battle!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-amber-400 selection:text-[#1F040B]">
        {children}
      </body>
    </html>
  );
}