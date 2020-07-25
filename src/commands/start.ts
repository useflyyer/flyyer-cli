import fs from "fs";
import path from "path";
import del from "del";
import { Command, flags } from "@oclif/command";
import Bundler, { ParcelOptions } from "parcel-bundler";
import chokidar, { WatchOptions } from "chokidar";

import { prepareProject } from "./build";
import { namespaced } from "../utils/debug";

const debug = namespaced("start");

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

    debug("current directory is: %s", CURR_DIR);
    debug("template source directory is: %s", from);
    debug("cache directory is: %s", cache);
    debug("processed files directory is: %s", to);
    debug("final build directory is: %s", out);

    await prepareProject({ from, to });

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

    // TODO: improve weak fs watch
    const chokidarOptions: WatchOptions = {
      atomic: 500,
      ignoreInitial: true,
    };
    debug("will run 'chokidar' with options: %O", chokidarOptions);
    chokidar.watch(from, chokidarOptions).on("all", async (event, path) => {
      debug("got chokidar event '%o' and will re-process project", { event, path });
      this.log("reloading...");
      await prepareProject({ from, to });
    });

    this.log(`🏗   Will build with Parcel 📦 bundler`);
    const glob = path.join(to, "*.html");
    const bundlerOptions: ParcelOptions = {
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
    };
    debug("glob pattern for Parcel is: %s", glob);
    debug("options for Parcel are: %O", bundlerOptions);
    const bundler = new Bundler(glob, bundlerOptions);

    const url = `${flags.https ? "https" : "http"}://${flags.host}:${flags.port}`;
    debug("will start Parcel server as: %s", url);
    const server = await bundler.serve(flags.port, flags.https, flags.host);
    if (!server.listening) {
      this.error(`Could not start server at ${url}`);
    }
    this.log(`🌠 flayyer dev server running at ${url}`);
  }
}
