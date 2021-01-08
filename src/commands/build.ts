import fs from "fs";
import path from "path";

import { Command, flags } from "@oclif/command";
import chalk from "chalk";
import dedent from "dedent";
import del from "del";
import Bundler, { ParcelOptions } from "parcel-bundler";

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

  static flags = {
    help: flags.help({ char: "h" }),
  };

  static args = [];

  async run() {
    this.parse(Build);

    debug("NODE_ENV is %s", String(process.env.NODE_ENV));
    this.log(`🛠   NODE_ENV is set to: ${process.env.NODE_ENV}`);

    const CURR_DIR = process.cwd();
    const from = path.join(CURR_DIR, "templates");
    const to = path.join(CURR_DIR, ".flayyer-processed");
    const cache = path.join(CURR_DIR, ".flayyer-cache");
    const out = path.join(CURR_DIR, ".flayyer-dist");
    const outMeta = path.join(CURR_DIR, ".flayyer-dist", "flayyer.json");
    const configPath = path.join(CURR_DIR, "flayyer.config.js");

    debug("config path is: %s", configPath);
    debug("current directory is: %s", CURR_DIR);
    debug("template source directory is: %s", from);
    debug("cache directory is: %s", cache);
    debug("processed files directory is: %s", to);
    debug("final build directory is: %s", out);

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

    this.log(`🏗   Will build with Parcel 📦 bundler`);
    const glob = path.join(to, "*.html");
    const bundlerOptions: ParcelOptions = {
      outDir: out,
      publicUrl: "./",
      watch: false,
      cache: true,
      cacheDir: cache,
      contentHash: true,
      minify: true,
      target: "browser",
      // logLevel: 0 as any,
      hmr: false,
      sourceMaps: false,
      detailedReport: false,
      // autoInstall: true,
    };
    debug("glob pattern for Parcel is: %s", glob);
    debug("options for Parcel are: %O", bundlerOptions);
    const bundler = new Bundler(glob, bundlerOptions);
    await bundler.bundle();
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
