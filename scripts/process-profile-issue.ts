import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  isOwner,
  readIssueEvent,
  rejectUnauthorized,
  reportProcessingFailure,
  setActionOutput
} from "./github-utils";
import { extractImageUrls, parseIssueForm, parseProfileFields } from "./issue-parser";
import { processAvatar } from "./image-processor";
import { validateContent } from "./content-validator";

async function main(): Promise<void> {
  const event = await readIssueEvent();
  if (!isOwner(event.issue.user.login)) {
    await rejectUnauthorized(event.issue.number);
    await setActionOutput("skip", true);
    return;
  }
  await setActionOutput("skip", false);
  try {
    const fields = parseIssueForm(event.issue.body ?? "");
    const updates = parseProfileFields(fields);
    const profilePath = path.join(process.cwd(), "src", "data", "profile.json");
    const profile = JSON.parse(await readFile(profilePath, "utf8")) as Record<string, unknown> & {
      avatar: Record<string, unknown>;
    };
    for (const key of ["siteTitle", "name", "description", "links"] as const) {
      if (updates[key] !== undefined) profile[key] = updates[key];
    }
    for (const key of ["mapPosition", "mapScale", "showName"] as const) {
      if (updates[key] !== undefined) profile.avatar[key] = updates[key];
    }
    const avatarUrls = extractImageUrls(fields["像素头像"]);
    if (avatarUrls[0]) {
      const avatar = await processAvatar(avatarUrls[0]);
      profile.avatar.path = avatar.path;
      profile.avatar.animated = avatar.animated;
    }
    await writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`);
    await validateContent();
  } catch (error) {
    await reportProcessingFailure(event.issue.number, error);
    process.exitCode = 1;
  }
}

await main();
