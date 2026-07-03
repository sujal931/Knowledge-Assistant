import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knowledge Assistant — Enterprise AI",
  description:
    "Chat with your organization's knowledge base using AI-powered retrieval and generation. Upload documents, ask questions, get accurate citations.",
  keywords: ["knowledge base", "AI", "RAG", "enterprise", "document search"],
  openGraph: {
    title: "Knowledge Assistant — Enterprise AI",
    description: "Chat with your organization's knowledge base using AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
