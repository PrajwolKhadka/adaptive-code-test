import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Maanak-Coding Platform",
  description: "IRT-adaptive coding practice platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
