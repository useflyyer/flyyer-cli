@flayyer/cli
===========

**Flayyer CLI**

📚 Please read the documentation here: [https://docs.flayyer.com/docs/cli/flayyer-cli](https://docs.flayyer.com/docs/cli/flayyer-cli)

👉 To start a new project use [`create-flayyer-app`](https://github.com/flayyer/create-flayyer-app) checkout our [Getting Started guide](https://docs.flayyer.com/docs/).

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@flayyer/cli.svg)](https://npmjs.org/package/@flayyer/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@flayyer/cli.svg)](https://npmjs.org/package/@flayyer/cli)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @flayyer/cli
$ flayyer COMMAND
running command...
$ flayyer (-v|--version|version)
@flayyer/cli/1.10.0 darwin-x64 node-v14.15.3
$ flayyer --help [COMMAND]
USAGE
  $ flayyer COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`flayyer build`](#flayyer-build)
* [`flayyer deploy DIRECTORY`](#flayyer-deploy-directory)
* [`flayyer help [COMMAND]`](#flayyer-help-command)
* [`flayyer start`](#flayyer-start)

## `flayyer build`

Build Flayyer project for production.

```
USAGE
  $ flayyer build

OPTIONS
  -h, --help  show CLI help

DESCRIPTION
  See online documentation here: https://docs.flayyer.com/docs/cli/flayyer-cli#flayyer-build

EXAMPLES
  $ flayyer build
  $ flayyer build --help
```

_See code: [src/commands/build.ts](https://github.com/flayyer/flayyer-cli/blob/v1.10.0/src/commands/build.ts)_

## `flayyer deploy DIRECTORY`

Deploy your Flayyer templates (remember to execute 'build' before running this command)

```
USAGE
  $ flayyer deploy DIRECTORY

ARGUMENTS
  DIRECTORY  [default: .] Root directory where flayyer.config.js and the /templates directory is located.

OPTIONS
  -c, --config=config  [default: flayyer.config.js] Relative path to flayyer.config.js
  -h, --help           show CLI help
  --dry                Do everything but don't upload nor update deck

DESCRIPTION
  See online documentation here: https://docs.flayyer.com/docs/cli/flayyer-cli#flayyer-deploy

EXAMPLES
  $ flayyer deploy
  $ flayyer deploy src
  $ flayyer deploy --config flayyer.config.staging.js
  $ flayyer deploy --help
```

_See code: [src/commands/deploy.ts](https://github.com/flayyer/flayyer-cli/blob/v1.10.0/src/commands/deploy.ts)_

## `flayyer help [COMMAND]`

display help for flayyer

```
USAGE
  $ flayyer help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.1/src/commands/help.ts)_

## `flayyer start`

This command starts a development server using Parcel.js by default at http://localhost:7777

```
USAGE
  $ flayyer start

OPTIONS
  -H, --host=host  [default: localhost]
  -h, --help       show CLI help
  -p, --port=port  [default: 7777]
  --https

DESCRIPTION
  See online documentation here: https://docs.flayyer.com/docs/cli/flayyer-cli#flayyer-start

EXAMPLES
  $ flayyer start
  $ flayyer start -p 8000
  $ flayyer start -p 8000 -H 0.0.0.0
  $ flayyer start --help
```

_See code: [src/commands/start.ts](https://github.com/flayyer/flayyer-cli/blob/v1.10.0/src/commands/start.ts)_
<!-- commandsstop -->
