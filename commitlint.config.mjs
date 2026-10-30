export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "body-max-line-length": [0], // Disable 100 character line length limit
    "header-max-length": [2, "always", 120],
    "scope-empty": [2, "never"], // Enforces a scope like (app) or (tests)
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
  },
};
