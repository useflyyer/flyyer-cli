import fs from "fs";
import path from "path";
import { Command, flags } from "@oclif/command";
import { prompt } from "enquirer";
import limax from "limax";
import dedent from "dedent";

import { recursiveCopy } from "../utils/file";
import { namespaced } from "../utils/debug";

const debug = namespaced("new");

const TEMPLATES_DIR = path.join(__dirname, "..", "..", "templates");
const CHOICES = fs.readdirSync(TEMPLATES_DIR).filter((name) => {
  return fs.lstatSync(path.join(TEMPLATES_DIR, name)).isDirectory();
});

export default class New extends Command {
  static description = "create a new flayyer project";

  static flags = {
    help: flags.help({ char: "h" }),
    template: flags.string({ char: "t", description: "starting template", options: CHOICES }),
  };

  static args = [{ name: "name", description: "output directory for templates" }];

  async run() {
    const { args, flags } = this.parse(New);

    const response = await prompt<{ name: string; template: string }>([
      {
        type: "input",
        name: "name",
        initial: args.name,
        skip: Boolean(args.name),
        message: "Enter project name",
        validate: Boolean,
      },
      {
        type: "autocomplete" as any,
        name: "template",
        message: "Select the best template setup for you",
        hint: "You can customize the template later",
        initial: flags.template, // TODO: this expects an index
        skip: Boolean(flags.template),
        choices: CHOICES,
      },
    ]);

    const template = typeof response.template === "string" ? response.template : CHOICES[response.template];
    const name = limax(response.name);
    debug("will use: %o", { name, template });

    const CURR_DIR = process.cwd();
    const templatePath = path.join(__dirname, "..", "..", "templates", template);
    const targetPath = path.join(CURR_DIR, name);

    debug("current directory is: %s", CURR_DIR);
    debug("template source directory is: %s", templatePath);
    debug("target path is: %s", targetPath);

    if (fs.existsSync(targetPath)) {
      this.error(`Folder ${targetPath} exists. Delete or use another name.`);
    }
    fs.mkdirSync(targetPath);

    const SKIP_FILES = ["node_modules"];
    const replace = { name, "cli-version": this.config.version };
    debug("replacement values: %o", replace);
    debug("skip files: %o", SKIP_FILES);
    debug("will copy and replace: %o", { from: templatePath, to: targetPath });
    recursiveCopy(templatePath, targetPath, SKIP_FILES, replace);

    this.log(dedent`
      💫 Great!

      Project '${name}' with template '${template}' was successfully scaffolded in: ${targetPath}

      Now go to the generated directory and install the initial dependencies:

        cd ${name}
        npm install

      When you are ready to deploy execute:

        npm run build && npm run deploy

      Remember to setup your 'FLAYYER_KEY' environment variable.
      Forgot your key? Go to https://app.flayyer.com/
    `);

    debug("exiting oclif");
    this.exit();
  }
}
