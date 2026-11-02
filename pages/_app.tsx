import { Seo } from "@/components/Seo";
import { useUi } from "@/i18n/useUi";
import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { analyticsScript } from "@/lib/analytics";
import "@/index.css";

const analytics = analyticsScript();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const { text: tx } = useUi();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <Seo />
        <Head>
          <link rel="alternate" type="application/rss+xml" title={tx("Zcash Grants Hub: grant updates")} href="/feed.xml" />
          <link rel="icon" href="/favicon.ico?v=2" sizes="any" />
          <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        </Head>
        {analytics && (
          <Script defer src={analytics.src} strategy="afterInteractive" {...analytics.attrs} />
        )}
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <div className="flex min-h-screen flex-col">
            <AnnouncementBar />
            <Navbar />
            <main className="flex-1">
              <Component {...pageProps} />
            </main>
            <Footer />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
