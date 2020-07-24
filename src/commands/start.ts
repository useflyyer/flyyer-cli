import fs from "fs";
import path from "path";
import del from "del";
import { Command, flags } from "@oclif/command";
import Bundler from "parcel-bundler";
import chokidar from "chokidar";

import { prepareProject } from "./build";

export default class Start extends Command {
  static description = "start dev server";

  static flags = {
    help: flags.help({ char: "h" }),
    port: flags.integer({ char: "p", default: 7777 }),
    host: flags.string({ default: "localhost" }),
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
    await prepareProject({ from, to });

    if (fs.existsSync(to)) {
      this.log(`🗑   Cleaning temporal directory...`);
      await del([to]);
    }
    if (fs.existsSync(out)) {
      this.log(`🗑   Cleaning destiny directory...`);
      await del([out]);
    }

    // TODO: improve weak fs watch
    chokidar
      .watch(from, {
        atomic: 500,
        ignoreInitial: true,
      })
      .on("all", async (event, path) => {
        this.log("reloading...");
        await prepareProject({ from, to });
      });

    const glob = path.join(to, "*.html");
    const bundler = new Bundler(glob, {
      outDir: out,
      publicUrl: "/",
      watch: true,
      cache: true,
      cacheDir: cache,
      contentHash: false,
      minify: false,
      target: "browser",
      // logLevel: 0 as any,
      hmr: true,
      sourceMaps: true,
      detailedReport: false,
      // autoInstall: true,
    });
    const server = await bundler.serve(flags.port, flags.https, flags.host);
    const url = `${flags.https ? "https" : "http"}://${flags.host}:${flags.port}`;
    if (!server.listening) {
      this.error(`Could not start server at ${url}`);
    }
    this.log(`🌠 flayyer dev server running at ${url}`);
  }
}
