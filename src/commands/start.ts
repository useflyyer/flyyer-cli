import fs from "fs";
import path from "path";

import { Command, flags } from "@oclif/command";
import chalk from "chalk";
import chokidar, { WatchOptions } from "chokidar";
import dedent from "dedent";
import del from "del";
import open from "open";
import Bundler, { ParcelOptions } from "parcel-bundler";
import qs from "qs";

import { prepareProject } from "../prepare";
import { namespaced } from "../utils/debug";
import { TemplateRegistry } from "./build";

const debug = namespaced("start");

export default class Start extends Command {
  static description = dedent`
    This command starts a development server using Parcel.js by default at http://localhost:7777
    See online documentation here: https://docs.flayyer.com/docs/cli/flayyer-cli#flayyer-start
  `;

  static examples = [
    // Add examples here:
    "$ flayyer start",
    "$ flayyer start -p 8000",
    "$ flayyer start -p 8000 -H 0.0.0.0",
    "$ flayyer start --help",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    port: flags.integer({ char: "p", default: 7777 }),
    host: flags.string({ char: "H", default: "localhost" }),
    https: flags.boolean({ default: false }),
  };

  static args = [];

  async run() {
    const { flags } = this.parse(Start);

    const CURR_DIR = process.cwd();
    const from = path.join(CURR_DIR, "templates");
    const to = path.join(CURR_DIR, ".flayyer-processed");
    const out = path.join(CURR_DIR, ".flayyer-dev");
    const cache = path.join(CURR_DIR, ".flayyer-cache");
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

    // TODO: improve weak fs watch
    const chokidarOptions: WatchOptions = {
      atomic: 500,
      ignoreInitial: true,
    };
    debug("will run 'chokidar' with options: %O", chokidarOptions);
    chokidar.watch(from, chokidarOptions).on("all", async (event, path) => {
      debug("got chokidar event '%o' and will re-process project", { event, path });
      this.log("reloading...");
      await prepareProject({ engine: config.engine, from, to, style });
    });

    this.log(`🏗   Will build with Parcel 📦 bundler`);
    const glob = path.join(to, "*.html");
    const bundlerOptions: ParcelOptions = {
      outDir: out,
      publicUrl: "/",
      watch: true,
      cache: true,
      cacheDir: cache,
      // contentHash: true,
      minify: false,
      target: "browser",
      // logLevel: 0 as any,
      hmr: true,
      sourceMaps: true,
      detailedReport: false,
      // autoInstall: true,
    };
    debug("glob pattern for Parcel is: %s", glob);
    debug("options for Parcel are: %O", bundlerOptions);
    const bundler = new Bundler(glob, bundlerOptions);

    const STUDIO_URL = "https://flayyer.github.io/flayyer-studio/";
    function studio({ template }: { template: string }) {
      const query: any = {};
      if (flags.host !== "localhost") {
        query.host = flags.host;
      }
      if (String(flags.port) !== "7777") {
        query.port = flags.port;
      }
      query.template = template;
      return STUDIO_URL + qs.stringify(query, { addQueryPrefix: true });
    }

    const url = `${flags.https ? "https" : "http"}://${flags.host}:${flags.port}`;
    debug("will start Parcel server as: %s", url);
    const server = await bundler.serve(flags.port, flags.https, flags.host);
    if (!server.listening) {
      this.error(`Could not start server at ${url}`);
    }
    this.log("");
    this.log(`🌠  Flayyer dev server running at ${url}`);

    this.log("");
    this.log(dedent`
      💡  Pass variables as query-params in the URL.
          Example: ${url}/hello.html?title=Hello+world
    `);
    this.log("");
    this.log(dedent`
      💡  This dev server sometimes fails or sometimes the UI does not update accordingly.
          Please restart the server if something goes wrong.
    `);
    this.log("");

    this.log(`💻  Remember to preview and develop your Flayyer templates at:`);
    this.log(`    ${chalk.bold(STUDIO_URL)}`);
    this.log("");
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      const preview = studio({ template: entry.name });
      const href = `${url}/${entry.name}.html`;
      this.log(`📄  Found template '${chalk.bold(entry.name)}' at: ${href}`);
      this.log(`    Go to: ${chalk.bold(preview)}`);
      if (i === entries.length - 1) {
        try {
          this.log(`    Opening Flayyer Studio in default browser...`);
          await open(preview);
        } catch {
          this.warn("Couldn't launch default web browser to open Flayyer Studio.");
        }
      }
    }
  }
}
