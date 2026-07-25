import { appendFile, readFile } from "node:fs/promises";

export interface GitHubIssueEvent {
  issue: {
    number: number;
    title: string;
    body: string | null;
    user: { login: string };
    labels: Array<{ name: string }>;
  };
  repository: {
    full_name: string;
    default_branch: string;
  };
}

export async function readIssueEvent(path = process.env.GITHUB_EVENT_PATH): Promise<GitHubIssueEvent> {
  if (!path) throw new Error("缺少 GITHUB_EVENT_PATH");
  return JSON.parse(await readFile(path, "utf8")) as GitHubIssueEvent;
}

export function isOwner(author: string, owner = process.env.OWNER_LOGIN): boolean {
  if (!owner) throw new Error("仓库变量 OWNER_LOGIN 尚未配置");
  return author.toLowerCase() === owner.toLowerCase();
}

export async function setActionOutput(name: string, value: string | boolean): Promise<void> {
  if (!process.env.GITHUB_OUTPUT) return;
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) throw new Error(`不安全的 Action 输出名称：${name}`);
  const normalized = String(value).replace(/[\r\n]+/g, " ");
  await appendFile(process.env.GITHUB_OUTPUT, `${name}=${normalized}\n`, "utf8");
}

async function githubRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) throw new Error("缺少 GitHub Actions API 环境变量");
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...init.headers
    }
  });
  if (!response.ok) throw new Error(`GitHub API 请求失败：${response.status} ${await response.text()}`);
  return response;
}

export async function commentOnIssue(issueNumber: number, body: string): Promise<void> {
  await githubRequest(`/issues/${issueNumber}/comments`, { method: "POST", body: JSON.stringify({ body }) });
}

export async function addIssueLabels(issueNumber: number, labels: string[]): Promise<void> {
  await githubRequest(`/issues/${issueNumber}/labels`, { method: "POST", body: JSON.stringify({ labels }) });
}

export async function closeIssue(issueNumber: number): Promise<void> {
  await githubRequest(`/issues/${issueNumber}`, { method: "PATCH", body: JSON.stringify({ state: "closed" }) });
}

export async function rejectUnauthorized(issueNumber: number): Promise<void> {
  if (process.env.MANAGEMENT_DISPATCH === "true") {
    throw new Error("管理请求未通过所有者校验");
  }
  await addIssueLabels(issueNumber, ["unauthorized"]);
  await commentOnIssue(issueNumber, "此管理入口只允许仓库所有者使用，未对仓库内容做任何修改。");
  await closeIssue(issueNumber);
}

export async function reportProcessingFailure(issueNumber: number, error: unknown): Promise<void> {
  if (process.env.MANAGEMENT_DISPATCH === "true") {
    throw new Error("私密管理请求处理失败", { cause: error });
  }
  const message = error instanceof Error ? error.message : String(error);
  await addIssueLabels(issueNumber, ["processing-failed"]);
  await commentOnIssue(issueNumber, `处理失败，仓库内容未提交：\`${message.slice(0, 1000)}\``);
}
