import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

loadDotEnv();

const PORT = Number(process.env.PORT || 8082);
const CLIENT_ID =
  process.env.GITHUB_OAUTH_CLIENT_ID || process.env.VITE_GITHUB_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_OAUTH_CLIENT_SECRET;

function json(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    json(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth/github/exchange") {
    if (!CLIENT_ID) {
      json(res, 500, { error: "Missing GITHUB_OAUTH_CLIENT_ID configuration." });
      return;
    }

    try {
      const { code, codeVerifier, redirectUri } = await parseBody(req);

      if (!code || !codeVerifier || !redirectUri) {
        json(res, 400, {
          error: "Missing required fields: code, codeVerifier, redirectUri.",
        });
        return;
      }

      const tokenPayload = new URLSearchParams({
        client_id: CLIENT_ID,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      });

      if (CLIENT_SECRET) {
        tokenPayload.set("client_secret", CLIENT_SECRET);
      }

      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: tokenPayload.toString(),
      });

      const tokenJson = await tokenResponse.json();
      if (!tokenResponse.ok || tokenJson.error) {
        json(res, 400, {
          error:
            tokenJson.error_description ||
            tokenJson.error ||
            "GitHub token exchange failed.",
        });
        return;
      }

      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${tokenJson.access_token}`,
        },
      });

      if (!userResponse.ok) {
        json(res, 400, { error: "Failed to fetch GitHub user profile." });
        return;
      }

      const user = await userResponse.json();
      json(res, 200, {
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
    } catch (err) {
      json(res, 500, {
        error: err instanceof Error ? err.message : "Internal OAuth server error.",
      });
    }
    return;
  }

  json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`[oauth-server] listening on http://localhost:${PORT}`);
});
