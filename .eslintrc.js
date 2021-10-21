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
    "node/no-missing-import": "off",
    "valid-jsdoc": "off", // TODO ?
    "unicorn/prefer-node-protocol": "off",
    "unicorn/no-abusive-eslint-disable": "off",
    "unicorn/prefer-module": "off",
    "@typescript-eslint/no-shadow": "off",
  },
};
