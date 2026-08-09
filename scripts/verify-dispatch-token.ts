const GITHUB_API_VERSION = "2022-11-28";
const REPOSITORY = "YanTZ06/weekly---repory";
const EVENT_TYPE = "weekly-management-verify-token";

async function main(): Promise<void> {
  const positional = process.argv[2];
  const token = process.env.GITHUB_DISPATCH_TOKEN ?? (positional && !positional.startsWith("-") ? positional : "");
  if (!token) {
    throw new Error(
      "缺少 GitHub token：先运行 `$env:GITHUB_DISPATCH_TOKEN = \"你的 token\"`，或直接传入 `pnpm run verify:dispatch -- <token>`"
    );
  }

  const response = await fetch(`https://api.github.com/repos/${REPOSITORY}/dispatches`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "YanTZ-weekly-management-verify",
      "X-GitHub-Api-Version": GITHUB_API_VERSION
    },
    body: JSON.stringify({ event_type: EVENT_TYPE })
  });
  const text = await response.text();

  console.log(`GitHub API 状态码：${response.status}`);
  if (text) {
    try {
      const data = JSON.parse(text) as { message?: unknown };
      if (typeof data.message === "string") console.log(`GitHub 提示：${data.message}`);
    } catch {
      console.log(`GitHub 响应：${text.slice(0, 200)}`);
    }
  }

  if (response.ok) {
    console.log("Token 可用：GitHub 已接受派发请求，不会触发任何内容修改。");
    return;
  }
  console.error("Token 不可用：请检查有效期、授权仓库是否包含 YanTZ06/weekly---repory、Contents 权限是否为 Read and write。");
  process.exitCode = 1;
}

await main();

export {};
