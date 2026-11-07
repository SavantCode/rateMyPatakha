import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rate My Patakha 🧨 | 7 Patakha Categorization & Leaderboard",
  description:
    "Enter your profile URL or username to get categorized into 1 of 7 Patakha images with your username on it and rank on the live leaderboard!",
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