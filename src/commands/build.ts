/* eslint-disable dot-notation */
import fs from "fs";
import path from "path";

import { Command, flags } from "@oclif/command";
import type { args } from "@oclif/parser";
import chalk from "chalk";
import dedent from "dedent";
import del from "del";
import Bundler, { ParcelOptions } from "parcel-bundler";

import { MetaOutput, MetaOutputTemplate, prepareProject, TemplateRegistry } from "../prepare";
import { namespaced } from "../utils/debug";

const debug = namespaced("build");

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

  async run(): Promise<void> {
    debug("cli version is: %s", this.config.version);
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

    this.log(`🔮  ${chalk.bold(`Found ${entries.length} templates, processing...`)}`);
    const schemas = new Map<string /* variable.name */, null | any /* JSONSchemaDraft6 as Object */>();
    for (const item of entries) {
      const vname = item.variables.name;
      const vsource = item.variables.path; // Hey Vsource, Michael here!
      const ename = item.entry.name;
      debug("will try to bundle variables file at: %s", vsource);
      try {
        const nodeBundler = new Bundler(vsource, {
          outDir: out,
          watch: false,
          cacheDir: cache,
          contentHash: false,
          minify: false,
          target: "node",
          sourceMaps: false,
          detailedReport: false,
          logLevel: 1,
        });
        await nodeBundler.bundle();
        const destination = path.join(out, vname);
        debug("will try to 'require()' bundled variables at: %s", destination);
        const required = require(destination);
        debug("file required and now will try to import `schema` via 'getFlayyerSchema'");
        const { schema } = await required.getFlayyerSchema();
        if (!schema) {
          throw new Error("Tried to import 'schema' but it is 'null' or missing");
        }
        debug("for file '%s' got schema: %O", vname, schema);
        schemas.set(vname, schema);
        const n = chalk.green(ename);
        this.log(`     - ${n}: found 'schema', can display variables UI on Flayyer.com  ✅`);
      } catch (error) {
        const n = chalk.yellow(ename);
        this.log(
          `     - ${n}: enable variables UI on Flayyer.com by exporting a 'schema' object from @flayyer/variables`,
        );
        debug(
          "failed to retrieve 'schema' of '%s' via 'getFlayyerSchema', maybe template is not exporting 'schema'",
          ename,
        );
        debug("error was: %o", error);
        schemas.set(vname, null);
      }
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

    const templates: MetaOutputTemplate[] = entries.map((item) => {
      const vname = item.variables.name;
      const ename = item.entry.name;
      return {
        slug: ename,
        schema6: schemas.get(vname),
      };
    });
    const meta: MetaOutput = { templates };
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
