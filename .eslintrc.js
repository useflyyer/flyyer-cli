module.exports = {
  extends: [
    "@flyyer/eslint-config",
    "@flyyer/eslint-config/typescript",
    "oclif",
    "oclif-typescript",
    "@flyyer/eslint-config/prettier",
  ],
  rules: {
    complexity: "off",
    "no-warning-comments": "off",
    "no-await-in-loop": "off",
    "unicorn/no-abusive-eslint-disable": "off",
    "@typescript-eslint/no-shadow": "off",
  },
};
