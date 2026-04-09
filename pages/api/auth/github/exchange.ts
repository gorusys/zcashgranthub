import type { NextApiRequest, NextApiResponse } from "next";

type ExchangeResponse =
  | {
      accessToken: string;
      tokenType: string;
      scope: string;
      user: {
        login: string;
        avatar_url: string;
        html_url: string;
        name: string | null;
      };
    }
  | { error: string };

interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExchangeResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const clientId =
    process.env.GITHUB_OAUTH_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID ||
    process.env.VITE_GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;

  if (!clientId) {
    return res
      .status(500)
      .json({ error: "Missing GITHUB_OAUTH_CLIENT_ID configuration." });
  }

  const { code, codeVerifier, redirectUri } = req.body ?? {};
  if (!code || !codeVerifier || !redirectUri) {
    return res
      .status(400)
      .json({ error: "Missing required fields: code, codeVerifier, redirectUri." });
  }

  const tokenPayload = new URLSearchParams({
    client_id: clientId,
    code: String(code),
    redirect_uri: String(redirectUri),
    code_verifier: String(codeVerifier),
  });

  if (clientSecret) {
    tokenPayload.set("client_secret", clientSecret);
  }

  try {
    const tokenResponse = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenPayload.toString(),
      }
    );
    const tokenJson = (await tokenResponse.json()) as GitHubTokenResponse;

    if (!tokenResponse.ok || tokenJson.error || !tokenJson.access_token) {
      return res.status(400).json({
        error:
          tokenJson.error_description ||
          tokenJson.error ||
          "GitHub token exchange failed.",
      });
    }

    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
    });

    if (!userResponse.ok) {
      return res.status(400).json({ error: "Failed to fetch GitHub user profile." });
    }

    const user = (await userResponse.json()) as {
      login: string;
      avatar_url: string;
      html_url: string;
      name?: string | null;
    };

    return res.status(200).json({
      accessToken: tokenJson.access_token,
      tokenType: tokenJson.token_type || "bearer",
      scope: tokenJson.scope || "",
      user: {
        login: user.login,
        avatar_url: user.avatar_url,
        html_url: user.html_url,
        name: user.name ?? null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : "Internal OAuth server error.",
    });
  }
}
