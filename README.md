@flyyer/cli
===========

**Flyyer CLI**

📚 Please read the documentation here: [https://docs.flyyer.io/docs/cli/flyyer-cli](https://docs.flyyer.io/docs/cli/flyyer-cli)

👉 To start a new project use [`create-flyyer-app`](https://github.com/useflyyer/create-flyyer-app) checkout our [Getting Started guide](https://docs.flyyer.io/docs/).

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@flyyer/cli.svg)](https://npmjs.org/package/@flyyer/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@flyyer/cli.svg)](https://npmjs.org/package/@flyyer/cli)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @flyyer/cli
$ flyyer COMMAND
running command...
$ flyyer (-v|--version|version)
@flyyer/cli/3.0.0-beta.1 darwin-x64 node-v16.4.2
$ flyyer --help [COMMAND]
USAGE
  $ flyyer COMMAND
...
```
<!-- usagestop -->

## Troubleshot

Show additional CLI information by setting `DEBUG=flyyer:*` environment variable.

```sh
DEBUG=flyyer:* npm run-script build

DEBUG=flyyer:* yarn build
```

# Commands
<!-- commands -->
* [`flyyer help [COMMAND]`](#flyyer-help-command)

## `flyyer help [COMMAND]`

display help for flyyer

```
USAGE
  $ flyyer help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.3/src/commands/help.ts)_
<!-- commandsstop -->
