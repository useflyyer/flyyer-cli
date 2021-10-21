/* eslint-disable dot-notation */

import fs from "fs";
import path from "path";

import { goerr } from "@flyyer/goerr";
import { importParcel } from "@flyyer/parcel-commonjs";
import type { FlyyerConfig } from "@flyyer/types";
import { JSONSchema6 } from "@flyyer/utils";
import { Command, flags } from "@oclif/command";
import type { args } from "@oclif/parser";
import type { InitialParcelOptions } from "@parcel/types";
import chalk from "chalk";
import del from "del";
import endent from "endent";

import { MetaOutput, MetaOutputTemplate, prepareProject, TemplateRegistry } from "../prepare";
import { namespaced } from "../utils/debug";

const debug = namespaced("build");

export default class Build extends Command {
  static description = endent`
    Build Flyyer project for production.
    See online documentation here: https://docs.flyyer.io/docs/cli/flyyer-cli#flyyer-build
  `;

  static examples = [
    // Add examples here:
    "$ flyyer build",
    "$ flyyer build --help",
  ];

  static args: args.Input = [
    {
      name: "directory",
      required: false,
      description: "Root directory where flyyer.config.js and the /templates directory is located.",
      default: ".",
    } as args.IArg<string>,
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    config: flags.string({
      char: "c",
      description: "Relative path to flyyer.config.js",
      default: "flyyer.config.js",
    }),
  };

  async run(): Promise<void> {
    debug("cli version is: %s", this.config.version);
    const { flags, args } = this.parse(Build);

    debug("[experimental] will import parcel 2 which is .mjs into a commonjs environment via 'await import()'.");
    const { Parcel, MemoryFS, NodeFS, createWorkerFarm } = await importParcel();
    if (!Parcel) {
      this.error("Failed to import Parcel 2 module. Make sure your Node.js version is updated.");
    }

    const NODE_ENV = process.env.NODE_ENV;
    const CURR_DIR: string = args["directory"];
    const root = path.resolve(process.cwd(), CURR_DIR);
    const out = path.resolve(root, ".flyyer-dist");
    const outMeta = path.resolve(root, ".flyyer-dist", "flyyer.json");
    const configPath = path.resolve(root, flags["config"]);
    const packagePath = path.resolve(root, "package.json");

    const from = path.join(root, "templates");
    const to = path.join(root, ".flyyer-processed");
    const cache = path.join(root, ".flyyer-cache");

    const isProduction = NODE_ENV === "production";

    debug("NODE_ENV is %s", String(NODE_ENV));
    debug("source directory is: %s", CURR_DIR);
    debug("root is: %s", root);
    debug("final build directory is: %s", out);
    debug("final meta file is: %s", outMeta);
    debug("config path is: %s", configPath);

    debug("template source directory is: %s", from);
    debug("processed files directory is: %s", to);
    debug("cache directory is: %s", cache);

    this.log(`🛠   NODE_ENV is set to: ${NODE_ENV}`);

    // TODO: config schema is not guaranteed.
    const [config, configError] = goerr<Partial<FlyyerConfig>, Error>(() => require(configPath));
    if (configError || !config) {
      this.error(`Failed to load flyyer.config.js file at path: ${configPath}`);
    } else if (!config.engine) {
      this.warn("Missing setting 'engine' in 'flyyer.config.js', will default to 'react'");
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
      entries = await prepareProject({ NODE_ENV, engine: config.engine, from, to, style });
      debug("processed entries: %O", entries);
    } catch (error: any) {
      debug.extend("error")(error);
      this.error(error); // exits
    }

    const USE_MEMORY: boolean = false as any;

    const packageText = fs.readFileSync(packagePath, "utf-8");

    // Create backup
    const backupPackageJSON = async () => {
      delete require.cache[require.resolve(packagePath)]; // DELETE CACHE

      const packagePathBackup = path.resolve(root, "package.json.flyyer-backup");
      fs.writeFileSync(packagePathBackup, packageText, { encoding: "utf-8" });
    };

    // TODO: Hack to alter package.json to set `"sideEffects"` to `false`.
    const createPackageJSON = async (overwrite: any) => {
      delete require.cache[require.resolve(packagePath)]; // DELETE CACHE

      const json = JSON.parse(packageText);
      Object.assign(json, overwrite);
      const next = JSON.stringify(json);
      fs.writeFileSync(packagePath, next, { encoding: "utf-8" }); // overwrite file
    };

    const restorePackageJSON = async () => {
      delete require.cache[require.resolve(packagePath)]; // DELETE CACHE

      const packagePathBackup = path.resolve(root, "package.json.flyyer-backup");
      const packageTextRestored = fs.readFileSync(packagePathBackup, "utf-8");
      fs.writeFileSync(packagePath, packageTextRestored, { encoding: "utf-8" }); // overwrite file
      del.sync(packagePathBackup);
    };

    // Create a backup of package.json
    await backupPackageJSON();

    // TODO: failed to override NodeFS (patching nor extending class), it looks like Parcel ignores it.
    // const genInputFs = (packagejson: any) => {
    //   const inputFS = new NodeFS();
    //   const readFileOriginal = inputFS.readFile;
    //   // @ts-expect-error Type stuff
    //   inputFS.readFile = async (filePath: FilePath, enc?: any) => {
    //     if (filePath === packagePath) {
    //       const text = fs.readFileSync(filePath, enc);
    //       const str = text.toString();
    //       const json = JSON.parse(str);
    //       // json["sideEffects"] = false;
    //       debug("[readFile] did: %o", Object.assign(json, packagejson));
    //       return JSON.stringify(Object.assign(json, packagejson));
    //     }
    //     return readFileOriginal(filePath, enc);
    //   };
    //   return inputFS;
    // };

    await createPackageJSON({ sideEffects: false }); // prevent importing files and css in Node.js

    this.log(`🔮  ${chalk.bold(`Found ${entries.length} templates, processing...`)}`);
    const schemas = new Map<string /* variable.name */, null | any /* JSONSchemaDraft6 as Object */>();
    for (const item of entries) {
      const vname = item.variables.name;
      const vsource = item.variables.path; // Hey Vsource, Michael here!
      const ename = item.entry.name;
      debug("will try to bundle variables file at: %s", vsource);
      const workerFarm = USE_MEMORY ? createWorkerFarm() : undefined;
      const outputFS = workerFarm ? new MemoryFS(workerFarm) : new NodeFS();
      // const inputFS = workerFarm ? new MemoryFS(workerFarm) : new NodeFS();

      try {
        const bundler = new Parcel({
          entries: vsource,
          defaultConfig: "@parcel/config-default",
          mode: NODE_ENV,

          workerFarm: workerFarm,
          env: {
            NODE_ENV: NODE_ENV,
          },
          serveOptions: false,
          hmrOptions: null,
          // inputFS,
          outputFS,
          defaultTargetOptions: {
            isLibrary: true, // required by files to export `getFlyyerSchema`
            engines: {
              node: "12", // TODO: Use current machine's node version?
            },
            outputFormat: "commonjs", // https://v2.parceljs.org/features/targets/#outputformat
            distDir: out,
            shouldOptimize: true, // important to optimize
            shouldScopeHoist: true, // prevent include of CSS file. Depends on package.json `"sideEffects": false`.
            publicUrl: "/",
            sourceMaps: !isProduction, // avoid uploading heavy .map.js files
          },
          cacheDir: cache,
          shouldDisableCache: true, // TODO: not sure
          shouldContentHash: true,
          shouldAutoInstall: true,
        });
        const { bundleGraph, buildTime } = await bundler.run();
        const bundles = bundleGraph.getBundles();
        debug(`success at building ${bundles.length} bundles in ${buildTime}ms as node`);
        const destination = path.join(out, vname);
        debug("will try to 'require()' bundled variables at: %s", destination);
        const required = require(destination);
        debug("file required and now will try to import `schema` via 'getFlyyerSchema'");
        const { schema }: { schema?: JSONSchema6 } = await required.getFlyyerSchema();
        if (!schema) {
          throw new Error("Tried to import 'schema' but it is 'null' or missing");
        }

        debug("for file '%s' got found schema: %O", vname, Boolean(schema));

        // TODO: Add more validations to schema format
        if (schema["type"] !== "object") {
          this.warn(`Schema for template ${vname} expected type 'object' but got: ${schema["type"]}`);
          continue;
        }

        /**
         * On Node.js target files are prefixed with 'file://'. We need to make them relative for browsers.
         * TODO: Create Parcel plugin.
         */
        const processVar = (uri: string): string => {
          if (uri.startsWith("file://")) {
            return uri.replace(`file://${out}`, "");
          }

          return uri;
        };

        /** Processed URIs to make them browser-like instead of Node-like. */
        const entries = Object.entries(schema["properties"] || {}).map(([key, value]) => {
          if (typeof value === "boolean") throw new Error("Boolean not allowed");
          // TODO: Robustness
          if (value["format"] === "uri-reference") {
            return [
              key,
              {
                ...value,
                default: value["default"] ? processVar(value["default"] as any) : undefined,
                examples: value["examples"] ? value["examples"].map((e) => processVar(e as any)) : undefined,
              },
            ];
          }

          return [key, value];
        });
        schema["properties"] = Object.fromEntries(entries);

        debug("for file '%s' got schema: %O", vname, schema);
        schemas.set(vname, schema);
        const n = chalk.green(ename);
        this.log(`     - ${n}: found 'schema', can display variables UI on Flyyer.io  ✅`);
      } catch (error) {
        const n = chalk.yellow(ename);
        this.log(`     - ${n}: enable variables UI on Flyyer.io by exporting a 'schema' object from @flyyer/variables`);
        debug(
          "failed to retrieve 'schema' of '%s' via 'getFlyyerSchema', maybe template is not exporting 'schema'",
          ename,
        );
        debug("error was: %o", error);
        schemas.set(vname, null);
      }
    }

    // Clean dir again
    await del([out]);
    debug("removed dir: %s", out);

    const workerFarm = USE_MEMORY ? createWorkerFarm() : undefined;
    const outputFS = workerFarm ? new MemoryFS(workerFarm) : new NodeFS();
    // const inputFS = workerFarm ? new MemoryFS(workerFarm) : new NodeFS();

    this.log(`🏗   Will build with Parcel 2 📦 bundler`);

    await createPackageJSON({ sideEffects: true }); // must be true so React and CSS modules take effect.

    const glob = path.join(to, "*.html");
    const bundlerOptions: InitialParcelOptions = {
      entries: glob,
      defaultConfig: "@parcel/config-default",
      mode: NODE_ENV,

      workerFarm: workerFarm,
      env: {
        NODE_ENV: NODE_ENV,
      },
      serveOptions: false,
      hmrOptions: null,
      // inputFS,
      outputFS,
      defaultTargetOptions: {
        isLibrary: false,
        engines: {
          browsers: ["last 1 Chrome version"],
        },
        outputFormat: "global", // TODO: not sure. // https://v2.parceljs.org/features/targets/#outputformat
        distDir: out,
        shouldOptimize: true,
        shouldScopeHoist: false, // defaults to true. It prevents React mounting and CSS imports.
        publicUrl: "/",
        sourceMaps: !isProduction, // avoid uploading heavy .map.js files
      },
      cacheDir: cache,
      shouldDisableCache: true,
      shouldContentHash: true,
      shouldAutoInstall: true,
    };
    debug("glob pattern for Parcel is: %s", glob);
    debug("options for Parcel are: %O", bundlerOptions);
    const bundler = new Parcel(bundlerOptions);
    debug("will bundle");
    const { bundleGraph, buildTime } = await bundler.run();
    const bundles = bundleGraph.getBundles();
    debug(`success at building ${bundles.length} bundles in ${buildTime}ms as browser`);

    await restorePackageJSON();

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

    this.log(endent`
      🌠   ${chalk.bold("Flyyer project successfully built!")}
      📂   Output directory: ${out}
      ${templates.map((t) => `🖼    Created template: ${chalk.bold(t.slug)}`).join("\n")}
    `);
    debug("exiting oclif");
    this.exit();
  }
}
