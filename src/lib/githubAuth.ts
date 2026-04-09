export interface GitHubAuthUser {
  login: string;
  avatar_url: string;
  html_url: string;
  name?: string | null;
}

export interface GitHubSession {
  accessToken: string;
  tokenType: string;
  scope: string;
  user: GitHubAuthUser;
}

const STORAGE_KEY = "github_oauth_session";
const STATE_KEY = "github_oauth_state";
const VERIFIER_KEY = "github_oauth_verifier";
const CONNECTED_EVENT = "github-auth-changed";

function getRedirectUri(): string {
  const envRedirect = import.meta.env.VITE_GITHUB_OAUTH_REDIRECT_URI as
    | string
    | undefined;
  if (envRedirect && envRedirect.trim().length > 0) {
    return envRedirect;
  }
  return `${window.location.origin}/auth/github/callback`;
}

function getClientId(): string {
  const clientId = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID as
    | string
    | undefined;
  if (!clientId) {
    throw new Error("Missing VITE_GITHUB_OAUTH_CLIENT_ID in environment.");
  }
  return clientId;
}

function getApiBase(): string {
  const apiBase = import.meta.env.VITE_AUTH_API_BASE as string | undefined;
  return apiBase && apiBase.trim().length > 0 ? apiBase : "";
}

function base64UrlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(byteLength = 64): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

export function readGitHubSession(): GitHubSession | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GitHubSession;
  } catch {
    return null;
  }
}

function persistSession(session: GitHubSession | null): void {
  if (session) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent(CONNECTED_EVENT));
}

export function clearGitHubSession(): void {
  persistSession(null);
}

export function getGitHubToken(): string | null {
  return readGitHubSession()?.accessToken ?? null;
}

export async function beginGitHubOAuth(): Promise<void> {
  const state = randomString(32);
  const codeVerifier = randomString(64);
  const challengeBytes = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(challengeBytes);
  const redirectUri = getRedirectUri();

  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(VERIFIER_KEY, codeVerifier);

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", getClientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  window.location.assign(url.toString());
}

export async function completeGitHubOAuth(code: string, state: string): Promise<void> {
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const redirectUri = getRedirectUri();

  if (!expectedState || state !== expectedState) {
    throw new Error("Invalid OAuth state. Please try connecting again.");
  }
  if (!verifier) {
    throw new Error("Missing PKCE verifier. Please try connecting again.");
  }

  const exchangeUrl = `${getApiBase()}/api/auth/github/exchange`;
  const response = await fetch(exchangeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      codeVerifier: verifier,
      redirectUri,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to exchange GitHub OAuth code.");
  }

  const session = (await response.json()) as GitHubSession;
  persistSession(session);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
}

export function subscribeToGitHubAuth(cb: () => void): () => void {
  const listener = () => cb();
  window.addEventListener(CONNECTED_EVENT, listener);
  return () => window.removeEventListener(CONNECTED_EVENT, listener);
}
