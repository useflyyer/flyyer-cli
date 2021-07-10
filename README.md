@flyyer/cli
===========

**flyyer CLI**

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
@flyyer/cli/1.18.1 darwin-x64 node-v14.15.3
$ flyyer --help [COMMAND]
USAGE
  $ flyyer COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`flyyer build [DIRECTORY]`](#flyyer-build-directory)
* [`flyyer deploy [DIRECTORY]`](#flyyer-deploy-directory)
* [`flyyer help [COMMAND]`](#flyyer-help-command)
* [`flyyer start`](#flyyer-start)

## `flyyer build [DIRECTORY]`

Build flyyer project for production.

```
USAGE
  $ flyyer build [DIRECTORY]

ARGUMENTS
  DIRECTORY  [default: .] Root directory where flyyer.config.js and the /templates directory is located.

OPTIONS
  -c, --config=config  [default: flyyer.config.js] Relative path to flyyer.config.js
  -h, --help           show CLI help

DESCRIPTION
  See online documentation here: https://docs.flyyer.io/docs/cli/flyyer-cli#flyyer-build

EXAMPLES
  $ flyyer build
  $ flyyer build --help
```

_See code: [src/commands/build.ts](https://github.com/useflyyer/flyyer-cli/blob/v1.18.1/src/commands/build.ts)_

## `flyyer deploy [DIRECTORY]`

Deploy your flyyer templates (remember to execute 'build' before running this command)

```
USAGE
  $ flyyer deploy [DIRECTORY]

ARGUMENTS
  DIRECTORY  [default: .] Root directory where flyyer.config.js and the /templates directory is located.

OPTIONS
  -c, --config=config  [default: flyyer.config.js] Relative path to flyyer.config.js
  -h, --help           show CLI help
  --dry                Do everything but don't upload nor update deck

DESCRIPTION
  See online documentation here: https://docs.flyyer.io/docs/cli/flyyer-cli#flyyer-deploy

EXAMPLES
  $ flyyer deploy
  $ flyyer deploy src
  $ flyyer deploy --config flyyer.config.staging.js
  $ flyyer deploy --help
```

_See code: [src/commands/deploy.ts](https://github.com/useflyyer/flyyer-cli/blob/v1.18.1/src/commands/deploy.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.2/src/commands/help.ts)_

## `flyyer start`

This command starts a development server using Parcel.js by default at http://localhost:7777

```
USAGE
  $ flyyer start

OPTIONS
  -H, --host=host        [default: localhost]
  -h, --help             show CLI help
  -p, --port=port        [default: 7777]
  --browser=(auto|none)  [default: auto]
  --https

DESCRIPTION
  See online documentation here: https://docs.flyyer.io/docs/cli/flyyer-cli#flyyer-start

EXAMPLES
  $ flyyer start
  $ flyyer start -p 8000
  $ flyyer start -p 8000 -H 0.0.0.0 --browser=none
  $ flyyer start --help
```

_See code: [src/commands/start.ts](https://github.com/useflyyer/flyyer-cli/blob/v1.18.1/src/commands/start.ts)_
<!-- commandsstop -->
