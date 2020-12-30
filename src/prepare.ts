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
      // Write template body to new file
      const contents = fs.readFileSync(namePath, "utf8");
      const writePath = path.join(to, name);
      fs.writeFileSync(writePath, contents, "utf8");

      const ext = path.extname(name);
      const nameNoExt = path.basename(name, ext);
      if (["react", "react-typescript"].includes(engine)) {
        if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
          const flayyerHTMLName = path.basename(writePath, ext) + ".html";
          const flayyerHTMLPath = path.join(path.dirname(writePath), flayyerHTMLName);
          const flayyerJSName = "flayyer-" + path.basename(writePath, ext) + ext;
          const flayyerJSPath = path.join(path.dirname(writePath), flayyerJSName);
          const flayyerJS = dedent`
            import React from "react"
            import ReactDOM from "react-dom";
            import qs from "qs";

            import Template from "./${nameNoExt}";

            function WrappedTemplate() {
              const {
                _id: id,
                _tags: tags,
                _ua: ua,
                ...variables
              } = qs.parse(window.location.search, { ignoreQueryPrefix: true });
              const agent = { name: ua };
              const props = { id, tags, variables, agent };

              return (
                <main id="flayyer-ready" style={${JSON.stringify(style)}}>
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
      } else if (["vue", "vue-typescript"].includes(engine)) {
        if ([".vue"].includes(ext)) {
          const flayyerHTMLName = path.basename(writePath, ext) + ".html";
          const flayyerHTMLPath = path.join(path.dirname(writePath), flayyerHTMLName);
          const flayyerJSName = "flayyer-" + path.basename(writePath, ext) + ".js";
          const flayyerJSPath = path.join(path.dirname(writePath), flayyerJSName);
          const flayyerJS = dedent`
            import Vue from "vue";
            import qs from "qs";

            import Template from "./${name}";

            new Vue({
              render: createElement => {
                const {
                  _id: id,
                  _tags: tags,
                  _ua: ua,
                  ...variables
                } = qs.parse(window.location.search, { ignoreQueryPrefix: true });
                const agent = { name: ua };
                const props = { id, tags, variables, agent };
                const style = ${JSON.stringify(style)};
                return createElement(Template, { props, style });
              },
            }).$mount("#root");
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
  }
  return entries;
}