import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EMBERLINGS",
  description: "EMBERLINGS: collect, ride, train and battle magical creatures.",
  icons: {
    icon: "/branding/emberlings-icon-32.png",
    shortcut: "/branding/emberlings-icon-32.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
