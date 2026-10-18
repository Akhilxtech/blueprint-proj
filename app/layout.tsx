import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { DeveloperWatermark } from "@/components/developer-watermark";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blueprint to Live",
  description: "College tech event by the Information Science and Engineering department.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("blueprint-theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F7F2F5] dark:bg-[#050505] text-[#302630] dark:text-[#FAFAFA] selection:bg-[#FCE7F1] dark:selection:bg-[#8B5CF6]/30 selection:text-[#BE3477] dark:selection:text-[#A78BFA]">
        <Providers>
  {children}
  <DeveloperWatermark />
</Providers>
      </body>
    </html>
  );
}