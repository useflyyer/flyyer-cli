import fs from "fs";
import path from "path";

import dedent from "dedent";

import { TemplateRegistry } from "./commands/build";

export type PrepareProjectArguments = {
  engine: string; // TODO: convert to enum
  from: string;
  to: string;
  style: {
    [key: string]: any;
  };
};

/**
 * Include style for https://github.com/twitter/twemoji
 */
const GLOBAL_STYLE = dedent`
  body, html {
    padding: 0;
    margin: 0;
    overflow: hidden;
  }
  img.emoji {
    display: inline;
    height: 1em;
    width: 1em;
    margin: 0 .05em 0 .1em;
    vertical-align: -0.1em;
  }
`;

export async function prepareProject({ engine, from, to, style }: PrepareProjectArguments) {
  const names = fs.readdirSync(from);

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
      const ext = path.extname(name);
      const nameNoExt = path.basename(name, ext);
      const writePath = path.join(to, name);
      const contents = fs.readFileSync(namePath, "utf8");
      // Write template body to new file
      fs.writeFileSync(writePath, contents, "utf8");

      if (["react", "react-typescript"].includes(engine)) {
        if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
          const flayyerHTMLName = path.basename(writePath, ext) + ".html";
          const flayyerHTMLPath = path.join(path.dirname(writePath), flayyerHTMLName);
          const flayyerJSName = "flayyer-" + path.basename(writePath, ext) + ext;
          const flayyerJSPath = path.join(path.dirname(writePath), flayyerJSName);
          const flayyerJS = dedent`
            import React, { useRef, useEffect } from "react"
            import ReactDOM from "react-dom";
            import qs from "qs";
            import twemoji from "twemoji";

            import Template from "./${nameNoExt}";

            function WrappedTemplate() {
              const {
                _id: id,
                _tags: tags,
                _ua: ua,
                _w,
                _h,
                ...variables
              } = qs.parse(window.location.search, { ignoreQueryPrefix: true });
              const agent = { name: ua };
              const props = { id, tags, variables, agent, width: Number(_w), height: Number(_h) };
              const elementRef = useRef();

              useEffect(() => {
                if (elementRef.current) {
                  twemoji.parse(elementRef.current, { folder: "svg", ext: ".svg" });
                }
              }, [elementRef.current]);

              return (
                <main id="flayyer-ready" ref={elementRef} style={${JSON.stringify(style)}}>
                  <Template {...props} />
                </main>
              );
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
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>${name}</title>
                <style>
                  ${GLOBAL_STYLE}
                </style>
              </head>
              <body>
                <div id="root"></div>

                <script type="module" src="./${flayyerJSName}"></script>
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
      } else if (["vue", "vue-typescript"].includes(engine)) {
        if ([".vue"].includes(ext)) {
          const flayyerHTMLName = path.basename(writePath, ext) + ".html";
          const flayyerHTMLPath = path.join(path.dirname(writePath), flayyerHTMLName);
          const flayyerJSName = "flayyer-" + path.basename(writePath, ext) + ".js";
          const flayyerJSPath = path.join(path.dirname(writePath), flayyerJSName);
          const flayyerJS = dedent`
            import { h, createApp, onMounted, nextTick } from "vue";
            import qs from "qs";
            import twemoji from "twemoji";

            import Template from "./${name}";

            createApp({
              render() {
                const {
                  _id: id,
                  _tags: tags,
                  _ua: ua,
                  _w,
                  _h,
                  ...variables
                } = qs.parse(window.location.search, { ignoreQueryPrefix: true });
                const agent = { name: ua };
                const props = { id, tags, variables, agent, width: Number(_w), height: Number(_h) };
                const style = ${JSON.stringify(style)};
                return h("main", { style }, h(Template, props));
              },
              setup() {
                onMounted(() => {
                  twemoji.parse(window.document.body, { folder: "svg", ext: ".svg" });
                  nextTick().then(() => {
                    // TODO: Not sure when to run twemoji
                    // twemoji.parse(window.document.body, { folder: "svg", ext: ".svg" });
                  });
                });
              },
            }).mount("#root");
          `;
          fs.writeFileSync(flayyerJSPath, flayyerJS, "utf8");

          const flayyerHTML = dedent`
            <!DOCTYPE html>

            <html>
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>${name}</title>
                <style>
                  ${GLOBAL_STYLE}
                </style>
              </head>
              <body>
                <div id="root"></div>

                <script type="module" src="./${flayyerJSName}"></script>
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
  }
  return entries;
}
