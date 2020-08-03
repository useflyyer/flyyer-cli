@flayyer/cli
===========

Flayyer CLI

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
@flayyer/cli/1.4.0 darwin-x64 node-v12.16.3
$ flayyer --help [COMMAND]
USAGE
  $ flayyer COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`flayyer build`](#flayyer-build)
* [`flayyer deploy`](#flayyer-deploy)
* [`flayyer help [COMMAND]`](#flayyer-help-command)
* [`flayyer start`](#flayyer-start)

## `flayyer build`

build flayyer project for production

```
USAGE
  $ flayyer build

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/build.ts](https://github.com/flayyer/flayyer-cli/blob/v1.4.0/src/commands/build.ts)_

## `flayyer deploy`

deploy your flayyer templates (remember to execute 'build' before running this command)

```
USAGE
  $ flayyer deploy

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/deploy.ts](https://github.com/flayyer/flayyer-cli/blob/v1.4.0/src/commands/deploy.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.1.0/src/commands/help.ts)_

## `flayyer start`

start dev server

```
USAGE
  $ flayyer start

OPTIONS
  -h, --help       show CLI help
  -p, --port=port  [default: 7777]
  --host=host      [default: localhost]
  --https
```

_See code: [src/commands/start.ts](https://github.com/flayyer/flayyer-cli/blob/v1.4.0/src/commands/start.ts)_
<!-- commandsstop -->
