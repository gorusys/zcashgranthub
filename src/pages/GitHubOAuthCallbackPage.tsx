import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { completeGitHubOAuth } from "@/lib/githubAuth";
import { Button } from "@/components/ui/button";

export default function GitHubOAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string>("");

  const oauthError = searchParams.get("error");
  const oauthErrorDescription = searchParams.get("error_description");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

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

    if (!code || !state) {
      setStatus("error");
      setError("Missing OAuth callback parameters.");
      return;
    }

    (async () => {
      try {
        await completeGitHubOAuth(code, state);
        setStatus("success");
        setTimeout(() => navigate("/dashboard"), 700);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "GitHub OAuth failed.");
      }
    })();
  }, [code, state, oauthError, navigate]);

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
            <Button className="mt-5" onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
