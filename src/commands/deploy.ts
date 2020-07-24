import fs from "fs";
import path from "path";
import del from "del";
import archiver from "archiver";
import { Command, flags } from "@oclif/command";
import { GraphQLClient } from "graphql-request";
import FormData from "form-data";
import fetch from "node-fetch";
import dedent from "dedent";

const mutation = dedent`
  mutation($input: APICreateDeckInput!) {
    create: API_createDeck(input: $input) {
      uploadUrl
      uploadFields {
        key
        value
      }
      deck {
        slug
        version
        tenant {
          slug
        }
        templates {
          slug
        }
      }
    }
  }
`;

export default class Deploy extends Command {
  static description = "deploy your flayyer templates (remember to execute 'build' before running this command)";

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

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const config = require(path.join(CURR_DIR, "flayyer.config.js"));
    if (!config.key) {
      this.error(`
        Missing 'key' property in file 'flayyer.config.js'.

        Remember to setup your 'FLAYYER_KEY' environment variable.
        Forgot your key? Go to https://app.flayyer.com/
      `);
    }

    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip", {
        // zlib: {level: 9}, // Sets the compression level.
      });

      output.on("close", function () {
        // console.log(archive.pointer() + ' total bytes')
        // console.log('archiver has been finalized and the output file descriptor has closed.')
        resolve({ zipPath });
      });
      output.on("end", function () {
        // console.log("Data has been drained");
      });

      archive.on("warning", (err: Error | any) => {
        if (err.code === "ENOENT") {
          reject(err);
        } else {
          reject(err);
        }
      });
      archive.on("error", (err: Error) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(out, false);
      archive.finalize();
    });

    const meta = JSON.parse(fs.readFileSync(outMeta, "utf-8"));

    const client = new GraphQLClient("https://api.flayyer.com/graphql", {
      headers: { authorization: `Token ${config.key}` },
    });

    const input = {
      slug: config.deck,
      templates: meta.templates,
    };

    const res = await client.request(mutation, { input });
    const { uploadUrl, uploadFields, deck } = res.create;
    const tenant = deck.tenant;

    const formData = new FormData();
    formData.append("Content-Type", "application/zip");
    for (const field of uploadFields) {
      formData.append(field.key, field.value);
    }
    formData.append("file", fs.createReadStream(zipPath)); // must be the last one

    const length = await new Promise<number>((resolve, reject) => {
      formData.getLength((err, len) => {
        if (err) return reject(err);
        return resolve(len);
      });
    });

    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Length": String(length),
      },
    });

    if (!response.ok) {
      this.error("Error while uploading bundle:" + (await response.text()));
    }

    if (fs.existsSync(zipPath)) {
      await del([zipPath]);
    }

    const host = `https://flayyer.host`;
    this.log(dedent`
      🌠   flayyer project successfully deployed!
    `);
    this.log("");
    this.log(`💡   To always render the latest version replace the version number with '_'`);
    this.log(`     ${`${host}/_/${tenant.slug}/${deck.slug}/TEMPLATE`}`);
    this.log("");
    this.log(`💡   To force an extension append '.png' or '.jpeg' as extensions`);
    this.log(`     ${`${host}/_/${tenant.slug}/${deck.slug}/TEMPLATE.jpeg`}`);
    this.log(`     For vector base templates prefer '.png', if you heavily rely on images then prefer '.jpeg'`);
    this.log("");
    for (const template of deck.templates) {
      const url = `${host}/${deck.version}/${tenant.slug}/${deck.slug}/${template.slug}`;
      this.log(`🖼    Created template with URL: ${url}`);
    }

    this.exit();
  }
}
