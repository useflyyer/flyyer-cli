/* eslint-disable dot-notation */
import fs from "fs";
import path from "path";

import { Command, flags } from "@oclif/command";
import type { args } from "@oclif/parser";
import reactRefresh from "@vitejs/plugin-react-refresh";
import vue from "@vitejs/plugin-vue";
import chalk from "chalk";
import dedent from "dedent";
import del from "del";
import * as Vite from "vite";

import { prepareProject } from "../prepare";
import { namespaced } from "../utils/debug";

const debug = namespaced("build");

export type TemplateRegistry = {
  name: string;
  path: string;
  html: {
    path: string;
  };
  js: {
    path: string;
  };
};

export default class Build extends Command {
  static description = dedent`
    Build Flayyer project for production.
    See online documentation here: https://docs.flayyer.com/docs/cli/flayyer-cli#flayyer-build
  `;

  static examples = [
    // Add examples here:
    "$ flayyer build",
    "$ flayyer build --help",
  ];

  static args: args.Input = [
    {
      name: "directory",
      required: false,
      description: "Root directory where flayyer.config.js and the /templates directory is located.",
      default: ".",
    } as args.IArg<string>,
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    config: flags.string({
      char: "c",
      description: "Relative path to flayyer.config.js",
      default: "flayyer.config.js",
    }),
  };

  async run() {
    const parsed = this.parse(Build);

    debug("NODE_ENV is %s", String(process.env.NODE_ENV));
    this.log(`🛠   NODE_ENV is set to: ${process.env.NODE_ENV}`);

    const CURR_DIR: string = parsed.args["directory"];
    const root = path.resolve(process.cwd(), CURR_DIR);
    const out = path.resolve(root, ".flayyer-dist");
    const outMeta = path.resolve(root, ".flayyer-dist", "flayyer.json");
    const configPath = path.resolve(root, parsed.flags["config"]);

    const from = path.join(root, "templates");
    const to = path.join(root, ".flayyer-processed");
    const cache = path.join(root, ".flayyer-cache");

    debug("source directory is: %s", CURR_DIR);
    debug("root is: %s", root);
    debug("final build directory is: %s", out);
    debug("final meta file is: %s", outMeta);
    debug("config path is: %s", configPath);

    debug("template source directory is: %s", from);
    debug("processed files directory is: %s", to);
    debug("cache directory is: %s", cache);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(configPath);
    if (!config.engine) {
      this.warn("Missing setting 'engine' in 'flayyer.config.js', will default to 'react'");
      config.engine = "react";
    }

    if (fs.existsSync(to)) {
      this.log(`🗑   Cleaning temporal directory...`);
      await del([to]);
      debug("removed dir: %s", to);
    }
    if (fs.existsSync(out)) {
      this.log(`🗑   Cleaning destiny directory...`);
      await del([out]);
      debug("removed dir: %s", out);
    }

    const style = { width: "100vw", height: "100vh", position: "relative" };
    let entries: TemplateRegistry[] = [];
    try {
      entries = await prepareProject({ engine: config.engine, from, to, style });
      debug("processed entries: %O", entries);
    } catch (error) {
      debug.extend("error")(error);
      this.error(error); // exits
    }

    this.log(`🏗   Will build with Vite ⚡️ bundler`);
    const bundlerOptions: Vite.InlineConfig = {
      configFile: false,
      root: to,
      base: "/",
      clearScreen: false,
      build: {
        assetsDir: ".", // plain output directory
        outDir: out,
        rollupOptions: {
          input: entries.map((e) => e.html.path),
        },
      },
      // esbuild: {
      //   // https://github.com/vitejs/vite/issues/769
      //   include: /\.(tsx?|jsx?)$/,
      //   exclude: [],
      //   loader: "tsx",
      // },
      plugins: [reactRefresh(), vue()],
    };
    debug("options for Vite are: %O", bundlerOptions);
    await Vite.build(bundlerOptions);
    debug("success at building");

    const templates = entries.map((entry) => ({ slug: entry.name }));
    const meta = { templates };
    debug("will create meta file at '%s' with: %O", outMeta, meta);
    fs.writeFileSync(outMeta, JSON.stringify(meta), "utf8");

    this.log(dedent`
      🌠   ${chalk.bold("flayyer project successfully built!")}
      📂   Output directory: ${out}
      ${templates.map((t) => `🖼    Created template: ${chalk.bold(t.slug)}`).join("\n")}
    `);
    debug("exiting oclif");
    this.exit();
  }
}
