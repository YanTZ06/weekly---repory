import {
  addIssueLabels,
  closeIssue,
  commentOnIssue,
  isOwner,
  readIssueEvent
} from "./github-utils";

const messages: Record<string, string> = {
  report: "周报事项已经通过校验、提交并推送到 main 分支。",
  profile: "个人资料已经通过校验、提交并推送到 main 分支。",
  tag: "新标签已经通过校验、提交并推送到 main 分支。",
  assets: "素材或项目配置已经通过校验、提交并推送到 main 分支。"
};

const resultLabels: Record<string, string> = {
  report: "事项 ID",
  tag: "标签 slug",
  assets: "配置 ID"
};

async function main(): Promise<void> {
  const event = await readIssueEvent();
  if (!isOwner(event.issue.user.login)) return;
  const kind = process.env.PROCESS_KIND ?? "report";
  const resultId = process.env.PROCESS_RESULT?.trim();
  const suffix = resultId ? ` ${resultLabels[kind] ?? "结果 ID"}：\`${resultId}\`。` : "";
  await addIssueLabels(event.issue.number, ["processed"]);
  await commentOnIssue(event.issue.number, `${messages[kind] ?? messages.report}${suffix}`);
  await closeIssue(event.issue.number);
}

await main();
