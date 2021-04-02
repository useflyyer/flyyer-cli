module.exports = {
  extends: [
    "@flayyer/eslint-config",
    "@flayyer/eslint-config/typescript",
    "oclif",
    "oclif-typescript",
    "@flayyer/eslint-config/prettier",
  ],
  rules: {
    "no-warning-comments": "off",
    "no-await-in-loop": "off",
    "unicorn/no-abusive-eslint-disable": "off",
    "@typescript-eslint/no-shadow": "off",
  },
};
