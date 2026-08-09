import { buildManagementRequest } from "../../src/config/manage-forms";
import { signToken, verifyToken } from "./token";

interface GitHubUser {
  login: string;
}

const GITHUB_API_VERSION = "2022-11-28";
const STATE_TTL_SECONDS = 10 * 60;
const SESSION_TTL_SECONDS = 2 * 60 * 60;

function securityHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff"
  };
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (origin !== env.ALLOWED_ORIGIN) return {};
  return {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}

function json(
  request: Request,
  env: Env,
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...securityHeaders(),
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function redirectToManage(env: Env, values: Record<string, string>): Response {
  const target = new URL(env.SITE_MANAGE_URL);
  target.hash = new URLSearchParams(values).toString();
  return Response.redirect(target.toString(), 302);
}

function assertConfigured(env: Env): void {
  for (const key of [
    "ALLOWED_ORIGIN",
    "GITHUB_OAUTH_CLIENT_ID",
    "GITHUB_OAUTH_CLIENT_SECRET",
    "GITHUB_DISPATCH_TOKEN",
    "GITHUB_REPOSITORY",
    "OWNER_LOGIN",
    "SESSION_SECRET",
    "SITE_MANAGE_URL"
  ] as const) {
    if (!env[key]?.trim()) throw new Error(`缺少 Worker 配置：${key}`);
  }
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY)) {
    throw new Error("GITHUB_REPOSITORY 格式错误");
  }
}

function callbackUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/auth/callback`;
}

async function beginLogin(request: Request, env: Env): Promise<Response> {
  const state = await signToken(
    {
      purpose: "oauth-state",
      exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
      nonce: crypto.randomUUID()
    },
    env.SESSION_SECRET
  );
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_OAUTH_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", callbackUrl(request));
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "false");
  return Response.redirect(authorize.toString(), 302);
}

async function exchangeOAuthCode(
  request: Request,
  env: Env,
  code: string
): Promise<string> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "YanTZ-weekly-management"
    },
    body: new URLSearchParams({
      client_id: env.GITHUB_OAUTH_CLIENT_ID,
      client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: callbackUrl(request)
    })
  });
  const data = await response.json() as { access_token?: string; error?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error ?? "OAuth token exchange failed");
  return data.access_token;
}

async function readGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "YanTZ-weekly-management",
      "X-GitHub-Api-Version": GITHUB_API_VERSION
    }
  });
  if (!response.ok) throw new Error("GitHub user lookup failed");
  const user = await response.json() as Partial<GitHubUser>;
  if (!user.login) throw new Error("GitHub user response is incomplete");
  return { login: user.login };
}

async function readGitHubErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    const data = JSON.parse(text) as { message?: unknown };
    return typeof data.message === "string" ? data.message.slice(0, 200) : "";
  } catch {
    return "";
  }
}

async function finishLogin(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return redirectToManage(env, { "github-auth": "error" });

  const statePayload = await verifyToken(state, env.SESSION_SECRET, "oauth-state");
  if (!statePayload) return redirectToManage(env, { "github-auth": "error" });

  try {
    const accessToken = await exchangeOAuthCode(request, env, code);
    const user = await readGitHubUser(accessToken);
    if (user.login.toLowerCase() !== env.OWNER_LOGIN.toLowerCase()) {
      return redirectToManage(env, {
        "github-auth": "denied",
        login: user.login
      });
    }
    const session = await signToken(
      {
        purpose: "management-session",
        exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
        nonce: crypto.randomUUID(),
        sub: user.login
      },
      env.SESSION_SECRET
    );
    return redirectToManage(env, {
      "github-auth": "success",
      session
    });
  } catch {
    return redirectToManage(env, { "github-auth": "error" });
  }
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
}

async function requireOwner(request: Request, env: Env): Promise<string | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const payload = await verifyToken(token, env.SESSION_SECRET, "management-session");
  if (!payload?.sub || payload.sub.toLowerCase() !== env.OWNER_LOGIN.toLowerCase()) return null;
  return payload.sub;
}

async function sessionStatus(request: Request, env: Env): Promise<Response> {
  const login = await requireOwner(request, env);
  if (!login) return json(request, env, { error: "unauthorized" }, 401);
  return json(request, env, { authenticated: true, login });
}

async function dispatchManagementRequest(request: Request, env: Env): Promise<Response> {
  const login = await requireOwner(request, env);
  if (!login) return json(request, env, { error: "unauthorized" }, 401);

  const contentLength = Number(request.headers.get("Content-Length") ?? 0);
  if (contentLength > 32_000) return json(request, env, { error: "request_too_large" }, 413);
  let input: { formId?: unknown; fields?: unknown };
  try {
    const raw = await request.text();
    if (raw.length > 32_000) return json(request, env, { error: "request_too_large" }, 413);
    input = JSON.parse(raw) as { formId?: unknown; fields?: unknown };
  } catch {
    return json(request, env, { error: "invalid_json" }, 400);
  }

  if (typeof input.formId !== "string" || !input.fields || typeof input.fields !== "object") {
    return json(request, env, { error: "invalid_request" }, 400);
  }

  let managementRequest;
  try {
    managementRequest = buildManagementRequest(
      input.formId,
      input.fields as Record<string, unknown>
    );
  } catch (error) {
    return json(
      request,
      env,
      { error: "validation_failed", message: error instanceof Error ? error.message : "表单校验失败" },
      400
    );
  }

  const requestId = crypto.randomUUID();
  const dispatchEndpoint = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/dispatches`;
  const dispatchHeaders = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
    "Content-Type": "application/json",
    "User-Agent": "YanTZ-weekly-management",
    "X-GitHub-Api-Version": GITHUB_API_VERSION
  };
  const response = await fetch(dispatchEndpoint, {
    method: "POST",
    headers: dispatchHeaders,
    body: JSON.stringify({
      event_type: "weekly-management",
      client_payload: {
        formId: managementRequest.formId,
        fields: managementRequest.fields,
        submittedBy: login,
        requestId
      }
    })
  });
  if (!response.ok) {
    const githubMessage = await readGitHubErrorMessage(response);
    console.error("GitHub dispatch failed", {
      status: response.status,
      requestId,
      githubMessage
    });
    return json(
      request,
      env,
      {
        error: "github_dispatch_failed",
        githubStatus: response.status,
        message: githubMessage
          ? `GitHub 派发失败（HTTP ${response.status}）：${githubMessage}`
          : `GitHub 派发失败（HTTP ${response.status}）`
      },
      502
    );
  }

  return json(request, env, {
    ok: true,
    requestId,
    actionsUrl: `https://github.com/${env.GITHUB_REPOSITORY}/actions/workflows/process-management-dispatch.yml`,
    submittedBy: login
  }, 202);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      assertConfigured(env);
    } catch {
      return json(request, env, { error: "worker_not_configured" }, 503);
    }

    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
        return new Response(null, { status: 403, headers: securityHeaders() });
      }
      return new Response(null, {
        status: 204,
        headers: { ...securityHeaders(), ...corsHeaders(request, env) }
      });
    }
    if (url.pathname === "/health" && request.method === "GET") {
      return json(request, env, { ok: true });
    }
    if (url.pathname === "/auth/login" && request.method === "GET") {
      return beginLogin(request, env);
    }
    if (url.pathname === "/auth/callback" && request.method === "GET") {
      return finishLogin(request, env);
    }

    if (request.headers.get("Origin") !== env.ALLOWED_ORIGIN) {
      return json(request, env, { error: "origin_not_allowed" }, 403);
    }
    if (url.pathname === "/api/session" && request.method === "GET") {
      return sessionStatus(request, env);
    }
    if (url.pathname === "/api/requests" && request.method === "POST") {
      return dispatchManagementRequest(request, env);
    }
    return json(request, env, { error: "not_found" }, 404);
  }
} satisfies ExportedHandler<Env>;
