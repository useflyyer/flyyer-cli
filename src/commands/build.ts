import fs from "fs";
import path from "path";
import del from "del";
import { Command, flags } from "@oclif/command";
import Bundler, { ParcelOptions } from "parcel-bundler";
import dedent from "dedent";

import { namespaced } from "../utils/debug";

const debug = namespaced("build");

export default class Build extends Command {
  static description = "build flayyer project for production";

  static flags = {
    help: flags.help({ char: "h" }),
  };

  static args = [];

  async run() {
    this.parse(Build);

    const CURR_DIR = process.cwd();
    const from = path.join(CURR_DIR, "templates");
    const to = path.join(CURR_DIR, ".flayyer-processed");
    const cache = path.join(CURR_DIR, ".flayyer-cache");
    const out = path.join(CURR_DIR, ".flayyer-dist");
    const outMeta = path.join(CURR_DIR, ".flayyer-dist", "flayyer.json");

    debug("current directory is: %s", CURR_DIR);
    debug("template source directory is: %s", from);
    debug("cache directory is: %s", cache);
    debug("processed files directory is: %s", to);
    debug("final build directory is: %s", out);

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

    let entries: TemplateRegistry[] = [];
    try {
      entries = await prepareProject({ from, to });
      debug("processed entries: %O", entries);
    } catch (error) {
      debug.extend("error")(error);
      this.error(error); // exits
    }

    this.log(`🏗   Will build with Parcel 📦 bundler`);
    const glob = path.join(to, "*.html");
    const bundlerOptions: ParcelOptions = {
      outDir: out,
      publicUrl: "/",
      watch: false,
      cache: true,
      cacheDir: cache,
      contentHash: false,
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
      🌠   flayyer project successfully built!
      📂   Output directory: ${out}
      ${templates.map((t) => `🖼    Created template: ${t.slug}`).join("\n")}
    `);
    debug("exiting oclif");
    this.exit();
  }
}

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

export async function prepareProject({ from, to }: { from: string; to: string }) {
  const names = fs.readdirSync(from);

  if (fs.existsSync(to)) {
    await del([to]);
  }
  fs.mkdirSync(to, { recursive: true });

  const entries: TemplateRegistry[] = [];
  for (const name of names) {
    const namePath = path.join(from, name);
    const stats = fs.statSync(namePath);
    if (stats.isDirectory()) {
      throw new Error(dedent`
        Directories inside '/templates' are not supported. Please move directory '${name}' outside of '/templates' to a new sibling directory like '/components' or '/utils'.
      `);
    } else if (stats.isFile()) {
      const contents = fs.readFileSync(namePath, "utf8");
      const writePath = path.join(to, name);
      fs.writeFileSync(writePath, contents, "utf8");

      const ext = path.extname(name);
      const nameNoExt = path.basename(name, ext);
      if ([".js", ".jsx", ".ts", "tsx"].includes(ext)) {
        const flayyerHTMLName = path.basename(writePath, ext) + ".html";
        const flayyerHTMLPath = path.join(path.dirname(writePath), flayyerHTMLName);
        const flayyerJSName = "flayyer-" + path.basename(writePath, ext) + ext;
        const flayyerJSPath = path.join(path.dirname(writePath), flayyerJSName);
        const flayyerJS = dedent`
          import React from "react"
          import ReactDOM from "react-dom";
          import qs from "qs";

          import Template from "./${name}";

          function WrappedTemplate() {
            const variables = qs.parse(window.location.search, { ignoreQueryPrefix: true });
            const props = { variables };
            return (
              <main id="flayyer-ready" style={{ width: 1200, height: 630, position: "relative" }}>
                <Template {...props} />
              </main>
            )
          }

          const element = document.getElementById("root");
          ReactDOM.render(<WrappedTemplate />, element);
        `;
        fs.writeFileSync(flayyerJSPath, flayyerJS, "utf8");

        const flayyerHTML = dedent`
            <!DOCTYPE html>

            <html>
              <head>
                <meta charset="utf-8" />
                <title>${name}</title>
                <style>
                  body, html {
                    padding: 0;
                    margin: 0;
                  }
                </style>
              </head>
              <body>
                <div id="root"></div>

                <script src="./${flayyerJSName}"></script>
              </body>
            </html>
          `;
        fs.writeFileSync(flayyerHTMLPath, flayyerHTML, "utf8");
        entries.push({
          name: nameNoExt,
          path: namePath,
          html: { path: flayyerHTMLPath },
          js: { path: flayyerJSPath },
        });
      }
    }
  }
  return entries;
}
