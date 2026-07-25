import { defineConfig } from "astro/config";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const configuredBase = process.env.PUBLIC_BASE_PATH;
const base = configuredBase ?? (process.env.GITHUB_ACTIONS === "true" && repositoryName ? `/${repositoryName}` : "/");
const site = process.env.PUBLIC_SITE_URL ?? "https://your-name.github.io";

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
