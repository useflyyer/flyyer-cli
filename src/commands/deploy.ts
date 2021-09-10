/* eslint-disable new-cap */
/* eslint-disable dot-notation */
/* eslint-disable no-warning-comments */

// import "cross-fetch/polyfill";

import fs from "fs";
import path from "path";

import { FlyyerRender } from "@flyyer/flyyer";
import { goerr } from "@flyyer/goerr";
import type { FlyyerConfig } from "@flyyer/types";
import { EXAMPLE_VARIABLES_FROM_SCHEMA } from "@flyyer/utils";
import { Command, flags } from "@oclif/command";
import type { args } from "@oclif/parser";
import archiver from "archiver";
import chalk from "chalk";
import dedent from "dedent";
import del from "del";
import FormData from "form-data";
import { GraphQLClient } from "graphql-request";

import * as mutations from "../flyyer-graphql/mutations";
import * as types from "../flyyer-graphql/types";
import { MetaOutput } from "../prepare";
import { namespaced } from "../utils/debug";

const debug = namespaced("deploy");

export default class Deploy extends Command {
  static description = dedent`
    Deploy your Flyyer templates (remember to execute 'build' before running this command)
    See online documentation here: https://docs.flyyer.io/docs/cli/flyyer-cli#flyyer-deploy
  `;

  static examples = [
    // Add examples here:
    "$ flyyer deploy",
    "$ flyyer deploy src",
    "$ flyyer deploy --config flyyer.config.staging.js",
    "$ flyyer deploy --help",
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
    dry: flags.boolean({
      description: "Do everything but don't upload nor update deck",
      default: false,
    }),
    remote: flags.string({
      description: "Flyyer GraphQL endpoint",
      hidden: true,
      default: "https://backend.flyyer.io/graphql",
    }),
  };

  async run(): Promise<void> {
    debug("cli version is: %s", this.config.version);
    const parsed = this.parse(Deploy);

    if (parsed.flags["dry"]) {
      debug("will run in dry mode");
    }

    const CURR_DIR: string = parsed.args["directory"];
    const root = path.resolve(process.cwd(), CURR_DIR);
    const out = path.resolve(root, ".flyyer-dist");
    const outMeta = path.resolve(root, ".flyyer-dist", "flyyer.json");
    const configPath = path.resolve(root, parsed.flags["config"]);

    const zipPath = path.resolve(root, ".flyyer-dist.zip");

    debug("source directory is: %s", CURR_DIR);
    debug("root is: %s", root);
    debug("final build directory is: %s", out);
    debug("final meta file is: %s", outMeta);
    debug("config path is: %s", configPath);

    debug("zipped bundle path is: %s", zipPath);

    const [meta, metaError] = goerr<MetaOutput, Error & { code?: string }>(() =>
      JSON.parse(fs.readFileSync(outMeta, "utf-8")),
    );
    if (metaError) {
      if (metaError.code === "ENOENT") {
        const npmBuild = chalk.bold("NODE_ENV=production npm run-script build");
        const yarnBuild = chalk.bold("NODE_ENV=production yarn build");
        this.error(dedent`
          Production files not found at '.flyyer-dist' directory. Please run 'flyyer build' before deploying.
          Execute ${npmBuild} or ${yarnBuild} and then try again.
        `);
      } else {
        this.error(`Error when loading meta information: ${String(metaError)}`);
      }
    } else if (!meta) {
      this.error(`Failed to load meta information at: ${outMeta}`);
    }

    // TODO: config schema is not guaranteed.
    const [config, configError] = goerr<Partial<FlyyerConfig>, Error>(() => require(configPath));
    if (configError || !config) {
      this.error(`Failed to load flyyer.config.js file at path: ${configPath}`);
    } else if (!config.engine) {
      this.warn("Missing setting 'engine' in 'flyyer.config.js', will default to 'react'");
      config.engine = "react";
    }

    if (config.key) {
      debug("'key' is present in config");
    } else {
      debug("'key' is not present in config");
      this.error(dedent`
        Missing 'key' property in file 'flyyer.config.js'.

        ${chalk.bold("Remember to setup your 'FLYYER_KEY' environment variable.")}

        Forgot your key? Go to https://flyyer.io/dashboard/_/settings
        First time using Flyyer? Create an account at https://flyyer.io/get-started
      `);
    }

    if (!config.engine) {
      this.warn("Missing setting 'engine' in 'flyyer.config.js', will default to 'react'");
      config.engine = "react";
    }

    if (!config.deck) {
      this.error(dedent`
        Missing "deck" property in flyyer.config.js object.
      `);
    }

    await new Promise((resolve, reject) => {
      debug("will create write stream for zip file");
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", {
        // zlib: {level: 9}, // Sets the compression level.
      });
      debug("created write stream");

      output.on("close", function () {
        // console.log(archive.pointer() + ' total bytes')
        // console.log('archiver has been finalized and the output file descriptor has closed.')
        debug("stream event: %s", "close");
        resolve({ zipPath });
      });
      output.on("end", function () {
        debug("stream event: %s", "end");
      });

      archive.on("warning", (err: Error | any) => {
        debug("stream event: %s", "warning");
        debug.extend("error")(err);
        if (err.code === "ENOENT") {
          reject(err);
        } else {
          reject(err);
        }
      });
      archive.on("error", (err: Error) => {
        debug("stream event: %s", "error");
        debug.extend("error")(err);
        reject(err);
      });

      archive.pipe(output);
      archive.directory(out, false);
      archive.finalize();
    });
    debug("file was successfully zipped");

    const url = parsed.flags["remote"];

    debug("creating graphql client with: %s", url);
    const client = new GraphQLClient(url, {
      headers: { authorization: `Token ${config.key}` },
    });

    const input: types.createDeckVariables["input"] = {
      slug: config.deck,
      templates: meta.templates,
      engine: config.engine,
      homepage: config.homepage,
      keywords: config.keywords,
      license: config.license,
      repositoryURL: config.repository,
      sizes: config.sizes as types.DeckSizes[],
      name: config.name,
      description: config.description,
      private: config.private,
      cli: this.config.version,
    };

    if (parsed.flags["dry"]) {
      debug("Running dry mode, won't upload deck");
    } else {
      debug("will execute with arguments '%o' query: %s", input, mutations.createDeck);
      const [res, error] = await goerr(
        client.request<types.createDeck, types.createDeckVariables>(mutations.createDeck, { input }),
      );
      if (error && error.message.includes("Tenant for token not found")) {
        this.error(dedent`
          Failed to authenticate using provided FLYYER_KEY token. Please check if you are using a valid token or generate a new one at https://flyyer.io/dashboard/_/settings
        `);
      } else if (error) {
        this.error(error);
      } else if (!res) {
        this.error("Failed to authenticate against Flyyer API: empty response");
      }

      const { uploadUrl, uploadFields, deck } = res["createDeck"];
      const tenant = deck.tenant;
      this.log(`🔑   Identified as ${chalk.bold(tenant.slug)}`);

      debug("will create FormData object");
      const formData = new FormData();
      formData.append("Content-Type", "application/zip");
      for (const field of uploadFields) {
        formData.append(field.key, field.value);
      }
      debug("will append 'file' to FormData which is the zipped file");
      formData.append("file", fs.createReadStream(zipPath)); // must be the last one

      const length = await new Promise<number>((resolve, reject) => {
        formData.getLength((err, len) => {
          if (err) return reject(err);
          return resolve(len);
        });
      });
      debug("FormData length is now: %s", length);

      const headers = {
        "Content-Length": String(length),
      };

      debug("will upload FormData to signed URL '%s' with headers: %o", uploadUrl, headers);
      this.log(`📦   Uploading bundled ${config.engine} app...`);
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData as any,
        headers,
      });

      if (!response.ok) {
        debug.extend("error")("error while uploading");
        this.error("Error while uploading bundle:" + (await response.text()));
      }

      if (fs.existsSync(zipPath)) {
        debug("will delete zipped file: %s", zipPath);
        await del([zipPath]);
      }

      debug("will confirm to invalidate Edge Cache");
      const [resConfirm, errorConfirm] = await goerr(
        client.request<types.createDeckConfirm, types.createDeckConfirmVariables>(mutations.createDeckConfirm, {
          input: { slug: deck["slug"], version: deck["version"] },
        }),
      );
      if (errorConfirm) {
        this.error(errorConfirm);
      } else if (!resConfirm) {
        this.error("Missing or invalid response from Flyyer API");
      }
      debug("confirmation response: %O", resConfirm["createDeckConfirm"]);

      const ext = "jpeg";
      const host = `https://cdn.flyyer.io/render/v2`;
      this.log(dedent`
        🌠   ${chalk.bold("Flyyer project successfully deployed!")}
      `);
      this.log("");
      this.log(`💡   To always render the latest version remove the number at the end of the URL.`);
      this.log(`     ${`${host}/${tenant.slug}/${deck.slug}/TEMPLATE`}`);
      this.log(`     This is not always recommended because makes caching harder.`);
      this.log("");
      this.log(`💡   To force a file format set '.png' or '.jpeg' as extension. Defaults to '.${ext}'`);
      this.log(`     ${`${host}/${tenant.slug}/${deck.slug}/TEMPLATE.jpeg`}`);
      this.log(`     ${`${host}/${tenant.slug}/${deck.slug}/TEMPLATE.png`}`);
      this.log(`     For vector base templates prefer '.png', if you heavily rely on pictures then prefer '.jpeg'`);
      this.log("");
      for (const { node: template } of deck.templates.edges) {
        const f = new FlyyerRender({
          tenant: tenant.slug,
          deck: deck.slug,
          template: template.slug,
          meta: { v: null },
        });
        const variables = template.schema6
          ? EXAMPLE_VARIABLES_FROM_SCHEMA(template.schema6, { defaults: true })
          : { title: "Hello World" };
        // const withEmoji = f
        //   .clone({ variables: { title: "Title", description: "Emoji supported EMOJI" } })
        //   .href()
        //   .replace("EMOJI", "😃");

        this.log(`🖼    ${chalk.green(`Created template ${chalk.bold(template.slug)} with URL:`)}`);
        this.log(`       - ${chalk.bold(f.href())}`);
        this.log(`     ${"Versioned (omit to use latest):"}`);
        this.log(`       - ${f.clone({ version: deck.version }).href()}`);
        this.log(`     ${"Supported extensions (jpeg, png, webp):"}`);
        this.log(`       - ${f.clone({ extension: "png" }).href()}`);
        this.log(`     ${"Cache bust:"}`);
        this.log(`       - ${f.clone({ meta: { v: undefined } }).href()}`);
        this.log(`     ${"Set size (defaults to 1200x630):"}`);
        this.log(`       - ${f.clone({ meta: { v: null, width: 1080, height: 1080 } }).href()}`);
        this.log(`     ${"Variables:"}`);
        this.log(`       - ${f.clone({ variables }).href()}`);
        // this.log(`     ${"Multiple variables:"}`);
        // this.log(`       - ${withEmoji}`);
        this.log("");
      }
    }

    this.log("");
    this.log(`📖   Checkout the official integration guides at: ${chalk.bold("https://docs.flyyer.io/guides")}`);
    this.log(`📖   flyyer URL formatters: ${chalk.bold("https://docs.flyyer.io/docs/libraries")}`);
    this.log("");
    this.log(`👉   Follow us on Twitter at: ${chalk.blueBright("https://twitter.com/useflyyer")}`);
    this.log(`👉   Join our Discord community at: ${chalk.magentaBright("https://flyyer.io/discord")}`);
    this.log("");

    debug("exiting oclif");
    this.exit();
  }
}
