import { useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Legacy URL: send users to the unified /apply page with the Coinholder tab.
 */
export default function ApplyCoinholderRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    void router.replace({
      pathname: "/apply",
      query: { ...router.query, tab: "coinholder" },
    });
    // Intentionally once when query is hydrated; including router.query can re-run during navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  return (
    <div className="container mx-auto px-4 py-8 text-sm text-muted-foreground">
      Redirecting to apply…
    </div>
  );
}
