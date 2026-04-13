import type { AppProps } from "next/app";
import Head from "next/head";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import "@/index.css";

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
  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>Zcash Grants Hub</title>
        <meta
          name="description"
          content="Zcash Grants Hub: discover grants, submit proposals via GitHub, and explore treasury and funding insights for the Zcash community."
        />
        <meta property="og:title" content="Zcash Grants Hub" />
        <meta
          property="og:description"
          content="A unified platform for Zcash grants discovery, proposal submission, and transparent treasury analytics."
        />
        <meta property="og:url" content="https://zgrantshub.com" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">
            <Component {...pageProps} />
          </main>
          <Footer />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
