import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Loader2 } from "lucide-react";
import { completeGitHubOAuth } from "@/lib/githubAuth";
import { Button } from "@/components/ui/button";

export default function GitHubOAuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string>("");

  const oauthError =
    typeof router.query.error === "string" ? router.query.error : null;
  const oauthErrorDescription =
    typeof router.query.error_description === "string"
      ? router.query.error_description
      : null;
  const code = typeof router.query.code === "string" ? router.query.code : null;
  const state = typeof router.query.state === "string" ? router.query.state : null;

  const message = useMemo(() => {
    if (oauthError) {
      return oauthErrorDescription || oauthError;
    }
    return error;
  }, [oauthError, oauthErrorDescription, error]);

  useEffect(() => {
    if (oauthError) {
      setStatus("error");
      return;
    }
    if (!router.isReady) return;

    if (!code || !state) {
      setStatus("error");
      setError("Missing OAuth callback parameters.");
      return;
    }

    (async () => {
      try {
        await completeGitHubOAuth(code, state);
        setStatus("success");
        setTimeout(() => void router.push("/dashboard"), 700);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "GitHub OAuth failed.");
      }
    })();
  }, [code, state, oauthError, router, router.isReady]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-xl rounded-lg border border-border/50 bg-card p-6 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Connecting your GitHub account...</h1>
          </>
        )}

        {status === "success" && (
          <>
            <h1 className="text-lg font-semibold text-foreground">GitHub connected successfully</h1>
            <p className="mt-2 text-sm text-muted-foreground">Redirecting you to the dashboard.</p>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-lg font-semibold text-destructive">Could not connect GitHub</h1>
            <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            <Button className="mt-5" onClick={() => void router.push("/")}>
              Back to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
