module.exports = {
  mode: "modules",
  out: "docusaurus/website/static/api",
  exclude: [
    "**/node_modules/**",
    "**/tests/**/*",
    "**/examples/**/*",
    "**/docusaurus/**/*",
    "**/examples/**/*",
  ],
  name: "lumos",
  includeDeclarations: true,
  excludePrivate: true,
  "external-modulemap": ".*packages/([^/]+)/.*",
  esModuleInterop: true,
};
