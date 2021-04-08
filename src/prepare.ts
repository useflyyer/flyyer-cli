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
  }
  img.emoji {
    display: inline;
    height: 1em;
    width: 1em;
    margin: 0 .05em 0 .1em;
    vertical-align: -0.1em;
  }
`;
const DEFAULT_TAGS = dedent`
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://twemoji.maxcdn.com" crossorigin>
`;

export async function prepareProject({
  engine,
  from,
  to,
  style,
}: PrepareProjectArguments): Promise<TemplateRegistry[]> {
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
                _lang: lang,
                _w,
                _h,
                ...variables
              } = qs.parse(window.location.search, { ignoreQueryPrefix: true });
              const agent = { name: ua };
              const props = { id, tags, variables, agent, lang: lang || undefined, width: Number(_w), height: Number(_h) };
              const elementRef = useRef();

              useEffect(() => {
                if (elementRef.current) {
                  twemoji.parse(elementRef.current, { folder: "svg", ext: ".svg" });
                }
              }, [elementRef.current]);

              return (
                <main ref={elementRef} style={${JSON.stringify(style)}}>
                  <Template {...props} />
                </main>
              );
            }

            const element = document.getElementById("root");
            ReactDOM.render(<WrappedTemplate />, element);

            // See: https://parceljs.org/hmr.html
            // @ts-ignore
            if (module.hot) module.hot.accept();
          `;
          fs.writeFileSync(flayyerJSPath, flayyerJS, "utf8");

          const flayyerHTML = dedent`
            <!DOCTYPE html>

            <html>
              <head>
                ${DEFAULT_TAGS}
                <title>${name}</title>
                <style>
                  ${GLOBAL_STYLE}
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
            import twemoji from "twemoji";

            import Template from "./${name}";

            new Vue({
              render: createElement => {
                const {
                  _id: id,
                  _tags: tags,
                  _ua: ua,
                  _lang: lang,
                  _w,
                  _h,
                  ...variables
                } = qs.parse(window.location.search, { ignoreQueryPrefix: true });
                const agent = { name: ua };
                const props = { id, tags, variables, agent, lang: lang || undefined, width: Number(_w), height: Number(_h) };
                const style = ${JSON.stringify(style)};
                return createElement(Template, { props, style });
              },
              mounted() {
                this.$nextTick(function () {
                  twemoji.parse(window.document.body, { folder: "svg", ext: ".svg" });
                })
              },
            }).$mount("#root");

            // See: https://parceljs.org/hmr.html
            // @ts-ignore
            if (module.hot) module.hot.accept();
          `;
          fs.writeFileSync(flayyerJSPath, flayyerJS, "utf8");

          const flayyerHTML = dedent`
            <!DOCTYPE html>

            <html>
              <head>
                ${DEFAULT_TAGS}
                <title>${name}</title>
                <style>
                  ${GLOBAL_STYLE}
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
