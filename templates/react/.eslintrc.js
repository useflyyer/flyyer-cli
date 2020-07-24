module.exports = {
  "env": {
    "browser": true,
    "node": true,
    "es2020": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:react/recommended"
  ],
  "parserOptions": {
    "ecmaFeatures": {
      "jsx": true
    },
    "ecmaVersion": 11,
    "sourceType": "module"
  },
  "plugins": [
    "react"
  ],
  "rules": {
    "react/prop-types": "off",
    "indent": ["warn", 2],
  },
  "ignorePatterns": ["!.eslintrc.js", "flayyer-*", "static"]
}
