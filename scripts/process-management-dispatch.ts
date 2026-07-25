import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildManagementRequest } from "../src/config/manage-forms";
import { setActionOutput } from "./github-utils";

interface ManagementDispatchEvent {
  action?: string;
  client_payload?: {
    formId?: unknown;
    fields?: unknown;
    submittedBy?: unknown;
    requestId?: unknown;
  };
  repository?: {
    full_name?: string;
    default_branch?: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function main(): Promise<void> {
  const sourceEventPath = process.env.GITHUB_EVENT_PATH;
  const ownerLogin = process.env.OWNER_LOGIN;
  if (!sourceEventPath || !ownerLogin) throw new Error("管理工作流配置不完整");

  const event = JSON.parse(
    await readFile(sourceEventPath, "utf8")
  ) as ManagementDispatchEvent;
  const payload = event.client_payload;
  if (
    event.action !== "weekly-management" ||
    !payload ||
    typeof payload.formId !== "string" ||
    !isRecord(payload.fields) ||
    typeof payload.submittedBy !== "string" ||
    typeof payload.requestId !== "string"
  ) {
    throw new Error("管理请求格式无效");
  }
  if (payload.submittedBy.toLowerCase() !== ownerLogin.toLowerCase()) {
    throw new Error("管理请求未通过所有者校验");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.requestId)) {
    throw new Error("管理请求标识无效");
  }

  const request = buildManagementRequest(payload.formId, payload.fields);
  const syntheticEventPath = path.join(
    process.cwd(),
    ".management-dispatch-event.json"
  );
  const syntheticEvent = {
    issue: {
      number: 0,
      title: request.title,
      body: request.body,
      user: { login: payload.submittedBy },
      labels: request.labels.map((name) => ({ name }))
    },
    repository: {
      full_name: event.repository?.full_name ?? process.env.GITHUB_REPOSITORY ?? "",
      default_branch: event.repository?.default_branch ?? "main"
    }
  };

  await writeFile(syntheticEventPath, JSON.stringify(syntheticEvent), "utf8");
  process.env.GITHUB_EVENT_PATH = syntheticEventPath;
  process.env.MANAGEMENT_DISPATCH = "true";
  await setActionOutput("request_id", payload.requestId);

  try {
    if (
      request.formId === "add-report-item" ||
      request.formId === "update-report-item" ||
      request.formId === "change-report-status"
    ) {
      await import("./process-report-issue");
    } else if (request.formId === "update-profile") {
      await import("./process-profile-issue");
    } else {
      await import("./process-assets-issue");
    }
  } finally {
    process.env.GITHUB_EVENT_PATH = sourceEventPath;
    delete process.env.MANAGEMENT_DISPATCH;
    await rm(syntheticEventPath, { force: true });
  }
}

try {
  await main();
} catch {
  throw new Error("私密管理请求处理失败；输入内容未写入公开日志");
}
