import { defineConfig } from "astro/config";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const configuredBase = process.env.PUBLIC_BASE_PATH?.trim();
const base = configuredBase || (process.env.GITHUB_ACTIONS === "true" && repositoryName ? `/${repositoryName}` : "/");

function resolveSite(value) {
  const fallback = "https://yantz06.github.io";
  const configuredSite = value?.trim();
  if (!configuredSite) return fallback;

  try {
    const parsed = new URL(configuredSite);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback;
    return parsed.origin;
  } catch {
    return fallback;
  }
}

const site = resolveSite(process.env.PUBLIC_SITE_URL);

export default defineConfig({
  site,
  base,
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory"
  },
  markdown: {
    shikiConfig: {
      theme: "github-light"
    }
  },
  vite: {
    build: {
      assetsInlineLimit: 2048
    }
  }
});
