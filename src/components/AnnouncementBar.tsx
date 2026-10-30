import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight, Heart, X } from "lucide-react";

/** Bump when the announcement changes so previously dismissed visitors see the new one. */
const DISMISS_KEY = "zgh:announcement:donate-v1";

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function AnnouncementBar() {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage unavailable: dismiss for this page view only */
    }
  };

  if (dismissed || router.pathname === "/donate") return null;

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="relative border-b border-primary/20 bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15"
    >
      <div className="container mx-auto flex min-h-10 items-center justify-center gap-x-3 px-10 py-2 text-center text-xs sm:text-sm">
        <span className="hidden shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground sm:inline">
          New
        </span>
        <p className="text-foreground/90">
          <Heart className="mr-1.5 inline h-3.5 w-3.5 -translate-y-px text-primary" aria-hidden />
          <span className="hidden sm:inline">
            Support Zcash Grants Hub with a shielded ZEC donation, or help build it.{" "}
          </span>
          <span className="sm:hidden">Support the hub: </span>
          <Link
            href="/donate"
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            Donate
          </Link>
          <span className="mx-1.5 text-muted-foreground">·</span>
          <Link
            href="/donate#contribute"
            className="inline-flex items-center gap-0.5 font-semibold text-primary underline-offset-2 hover:underline"
          >
            Contribute
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-4"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
