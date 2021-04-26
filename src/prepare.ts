import fs from "fs";
import path from "path";

import dedent from "dedent";

import { ENCODED } from "./assets/logo";

export type PrepareProjectArguments = {
  engine: string; // TODO: convert to enum
  from: string;
  to: string;
  /**
   * CSS Style for root element.
   */
  style: {
    [key: string]: any;
  };
};

export type TemplateRegistryItem = {
  /** Filename without path */
  name: string;
  /** Absolute path */
  path: string;
};

export type TemplateRegistry = {
  // name: string;
  // /** Absolute path to template file created by user at `/templates` */
  // path: string;
  entry: TemplateRegistryItem;
  html: TemplateRegistryItem;
  js: TemplateRegistryItem;
  variables: TemplateRegistryItem;
};

export type MetaOutputTemplate = { slug: string; schema6?: any | null };
export type MetaOutput = {
  templates: MetaOutputTemplate[];
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
const FAVICON = ENCODED;
const DEFAULT_TAGS = dedent`
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" href="${FAVICON}" sizes="any" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
  <link rel="preconnect" href="https://twemoji.maxcdn.com" crossorigin>
`;
const ALLOWED_ORIGINS = ["https://flayyer.com", "https://flayyer.github.io", "http://localhost:9000"];
const PARSE_QS = dedent`
  // @ts-ignore
  function PARSE_QS(str) {
    const {
      _id: id,
      _tags: tags,
      _ua: ua,
      _loc: loc,
      _w,
      _h,
      ...variables
    } = qs.parse(str, { ignoreQueryPrefix: true });
    const agent = { name: ua };
    return { id, tags, variables, agent, locale: loc || undefined, width: Number(_w), height: Number(_h) }
  }
`;
const IS_FUNCTION = dedent`
  // @ts-ignore
  function isFunction(func) {
    // @ts-ignore
    if (func && typeof func === "function") {
      return true
    }
    return false
  }
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

      const flayyerEntry = nameNoExt;
      // const flayyerEntryExt = nameNoExt + ext;
      if (["react", "react-typescript"].includes(engine)) {
        if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
          const flayyerHTMLName = path.basename(writePath, ext);
          const flayyerHTMLNameExt = flayyerHTMLName + ".html";
          const flayyerHTMLPath = path.join(path.dirname(writePath), flayyerHTMLNameExt);

          const flayyerJSName = "flayyer-" + path.basename(writePath, ext);
          const flayyerJSNameExt = flayyerJSName + ext;
          const flayyerJSPath = path.join(path.dirname(writePath), flayyerJSNameExt);

          const flayyerVariablesName = "flayyer-" + path.basename(writePath, ext) + ".variables";
          const flayyerVariablesNameExt = flayyerVariablesName + ext;
          const flayyerVariablesPath = path.join(path.dirname(writePath), flayyerVariablesNameExt);

          const flayyerJS = dedent`
            import React, { useRef, useEffect, useState } from "react"
            import ReactDOM from "react-dom";
            import qs from "qs";
            import twemoji from "twemoji";

            import Template from "./${flayyerEntry}";

            const ALLOWED_ORIGINS = ${JSON.stringify(ALLOWED_ORIGINS)};

            ${PARSE_QS}

            function WrappedTemplate() {
              const [props, setProps] = useState(() => {
                // Set initial props.
                return PARSE_QS(window.location.search.replace("?", "") || window.location.hash.replace("#", ""));
              });
              const elementRef = useRef();

              useEffect(() => {
                if (elementRef.current) {
                  twemoji.parse(elementRef.current, { folder: "svg", ext: ".svg" });
                }
              }, [elementRef.current]);

              useEffect(() => {
                // @ts-ignore
                const handler = (event) => {
                  const known = ALLOWED_ORIGINS.includes(event.origin);
                  if (!known) {
                    return console.warn("Origin %s is not known. Ignoring posted message.", event.origin);
                  } else if (typeof event.data !== "object") {
                    return console.error("Message sent by %s is not an object. Ignoring posted message.", event.origin);
                  }
                  const message = event.data;
                  switch (message.type) {
                    case "flayyer-variables": {
                      setProps(PARSE_QS(message["payload"]["query"]));
                      break;
                    }
                    default: {
                      console.warn("Message not recognized: %s", message.type);
                      break;
                    }
                  }
                };
                window.addEventListener("message", handler, false);
                return () => window.removeEventListener("message", handler);
              }, []);

              return (
                <main ref={elementRef} style={${JSON.stringify(style)}}>
                  {/* @ts-ignore */}
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
                <title>${flayyerJSNameExt}</title>
                <style>
                  ${GLOBAL_STYLE}
                </style>
              </head>
              <body>
                <div id="root"></div>

                <script src="./${flayyerJSNameExt}"></script>
              </body>
            </html>
          `;
          fs.writeFileSync(flayyerHTMLPath, flayyerHTML, "utf8");

          const flayyerVariables = dedent`
            ${IS_FUNCTION}
            export async function getFlayyerSchemaExecute() {
              try {
                // @ts-ignore
                const { getFlayyerSchema } = await import("./${flayyerEntry}");
                // @ts-ignore
                return isFunction(getFlayyerSchema) ? getFlayyerSchema() : getFlayyerSchema;
              } catch (err) {
                return null;
              }
            };
          `;
          fs.writeFileSync(flayyerVariablesPath, flayyerVariables, "utf8");

          entries.push({
            entry: { name: nameNoExt, path: namePath },
            html: { name: flayyerHTMLName, path: flayyerHTMLPath },
            js: { name: flayyerJSName, path: flayyerJSPath },
            variables: { name: flayyerVariablesName, path: flayyerVariablesPath },
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

            const ALLOWED_ORIGINS = ${JSON.stringify(ALLOWED_ORIGINS)};

            ${PARSE_QS}

            new Vue({
              data: {
                parameters: {},
              },
              render(createElement) {
                const parameters = this.parameters;
                const style = ${JSON.stringify(style)};
                return createElement(Template, { props: parameters, style });
              },
              created() {
                this.parameters = PARSE_QS(window.location.search.replace("?", "") || window.location.hash.replace("#", ""));
              },
              mounted() {
                this.$nextTick(this.emojify);
                window.addEventListener("message", this.handler, false);
              },
              beforeDestroy() {
                window.removeEventListener("message", this.handler)
              },
              methods: {
                emojify() {
                  twemoji.parse(window.document.body, { folder: "svg", ext: ".svg" });
                },
                handler(event) {
                  const known = ALLOWED_ORIGINS.includes(event.origin);
                  if (!known) {
                    return console.warn("Origin %s is not known. Ignoring posted message.", event.origin);
                  } else if (typeof event.data !== "object") {
                    return console.error("Message sent by %s is not an object. Ignoring posted message.", event.origin);
                  }
                  const message = event.data;
                  switch (message.type) {
                    case "flayyer-variables": {
                      this.parameters = PARSE_QS(message["payload"]["query"]);
                      break;
                    }
                    default: {
                      console.warn("Message not recognized: %s", message.type);
                      break;
                    }
                  }
                },
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
            variables: {
              path: "", // TODO
            },
          });
        }
      }
    }
  }
  return entries;
}
