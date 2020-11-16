/* eslint-disable no-warning-comments */

import "cross-fetch/polyfill";

import fs from "fs";
import path from "path";
import del from "del";
import chalk from "chalk";
import archiver from "archiver";
import { Command, flags } from "@oclif/command";
import { GraphQLClient } from "graphql-request";
import FormData from "form-data";
import dedent from "dedent";

import { namespaced } from "../utils/debug";
import * as mutations from "../flayyer-graphql/mutations";
import * as types from "../flayyer-graphql/types";

const debug = namespaced("deploy");

export default class Deploy extends Command {
  static description = dedent`
    Deploy your Flayyer templates (remember to execute 'build' before running this command)
    See online documentation here: https://app.flayyer.com/en/docs/cli/deploy
  `;

  static examples = [
    // Add examples here:
    "$ deploy",
    "$ deploy --help",
  ];

  static flags = {
    help: flags.help({ char: "h" }),
  };

  static args = [];

  async run() {
    this.parse(Deploy);

    const CURR_DIR = process.cwd();
    const out = path.join(CURR_DIR, ".flayyer-dist");
    const outMeta = path.join(CURR_DIR, ".flayyer-dist", "flayyer.json");
    const zipPath = path.join(CURR_DIR, ".flayyer-dist.zip");
    const configPath = path.join(CURR_DIR, "flayyer.config.js");

    debug("current directory is: %s", CURR_DIR);
    debug("final build directory is: %s", out);
    debug("config path is: %s", configPath);
    debug("zipped bundle path is: %s", zipPath);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(configPath);
    if (config.key) {
      debug("'key' is present in config");
    } else {
      debug("'key' is not present in config");
      this.error(`
        Missing 'key' property in file 'flayyer.config.js'.

        ${chalk.bold("Remember to setup your 'FLAYYER_KEY' environment variable.")}
        Forgot your key? Go to https://app.flayyer.com/
      `);
    }

    if (!config.engine) {
      this.warn("Missing setting 'engine' in 'flayyer.config.js', will default to 'react'");
      config.engine = "react";
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

    const meta = JSON.parse(fs.readFileSync(outMeta, "utf-8"));

    const url = "https://api.flayyer.com/graphql";

    debug("creating graphql client with: %s", url);
    const client = new GraphQLClient(url, {
      headers: { authorization: `Token ${config.key}` },
    });

    const input = {
      slug: config.deck,
      templates: meta.templates,
      engine: config.engine,
    };

    debug("will execute with arguments '%o' query: %s", input, mutations.createDeck);
    const res = await client.request<types.createDeck, types.createDeckVariables>(mutations.createDeck, { input }); // TODO: add typings
    const { uploadUrl, uploadFields, deck } = res.createDeck;
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
    this.log("📦   Uploading bundle...");
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData as any,
      headers,
    });

    if (!response.ok) {
      debug.extend("error")("error while uploading");
      this.error("Error while uploading bundle:" + (await response.text()));
    }

    // Invalidate Edge Cache
    for (const { node: template } of deck.templates.edges) {
      const invalidationURL = `https://flayyer.io/v2/${tenant.slug}/${deck.slug}/${template.slug}`;
      // eslint-disable-next-line no-await-in-loop
      const responseCacheDelete = await fetch(invalidationURL, {
        method: "delete",
        body: null,
      });
      if (responseCacheDelete.ok) {
        debug("invalidated cache: %s", invalidationURL);
      } else {
        debug.extend("error")("could not invalidate cache for: %s", invalidationURL);
      }
    }

    if (fs.existsSync(zipPath)) {
      debug("will delete zipped file: %s", zipPath);
      await del([zipPath]);
    }

    const ext = "jpeg";
    const host = `https://flayyer.host/v2`;
    this.log(dedent`
      🌠   ${chalk.bold("flayyer project successfully deployed!")}
    `);
    this.log("");
    this.log(`💡   To always render the latest version remove the number from the end of the URL.`);
    this.log(`     ${`${host}/${tenant.slug}/${deck.slug}/TEMPLATE`}`);
    this.log(`     This is not always recommended because makes caching harder.`);
    this.log("");
    this.log(`💡   To force a file format append '.png' or '.jpeg' as extension. Defaults to '.${ext}'`);
    this.log(`     ${`${host}/${tenant.slug}/${deck.slug}/TEMPLATE.jpeg`}`);
    this.log(`     For vector base templates prefer '.png', if you heavily rely on pictures then prefer '.jpeg'`);
    this.log("");
    for (const { node: template } of deck.templates.edges) {
      const latest = `${host}/${tenant.slug}/${deck.slug}/${template.slug}.${ext}`;
      const versioned = `${host}/${tenant.slug}/${deck.slug}/${template.slug}.${deck.version}.${ext}`;
      this.log(`🖼    Created template ${template.slug} with URL:`);
      this.log(`       - ${chalk.bold(latest)}`);
      this.log(`       - ${versioned}`);
    }
    this.log("");

    debug("exiting oclif");
    this.exit();
  }
}
