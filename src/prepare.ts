import fs from "fs";
import path from "path";

import dedent from "dedent";

import { ENCODED } from "./assets/logo";

export type PrepareProjectArguments = {
  NODE_ENV?: string;
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
  /** Template file created by user at `/templates` */
  entry: TemplateRegistryItem;
  html: TemplateRegistryItem;
  /** Generated JS file with componen wrapping the entry component. */
  js: TemplateRegistryItem;
  /** Generated file where `schema` is imported and exported for Node.js */
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
  <link rel="preconnect" href="https://cdn.flyyer.io" crossorigin>
`;
const ALLOWED_ORIGINS = [
  "https://www.flyyer.io",
  "https://flyyer.io",
  "https://useflyyer.github.io",
  "http://localhost:9000",
];
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
const CLASSNAME_ERROR = "flyyer-error" as const;
const EVENTS_VARIABLES = "flyyer-variables" as const;

export async function prepareProject({
  NODE_ENV = "development",
  engine,
  from,
  to,
  style,
}: PrepareProjectArguments): Promise<TemplateRegistry[]> {
  const names = fs.readdirSync(from);

  fs.mkdirSync(to, { recursive: true });

  const entries: TemplateRegistry[] = [];
  for (const nameExt of names) {
    const namePath = path.join(from, nameExt);
    const stats = fs.statSync(namePath);
    if (stats.isDirectory()) {
      throw new Error(dedent`
        Directories inside '/templates' are not supported. Please move directory '${nameExt}' outside of '/templates' to a new sibling directory like '/components' or '/utils'.
      `);
    } else if (stats.isFile()) {
      // Write template body to new file
      const contents = fs.readFileSync(namePath, "utf8");
      const writePath = path.join(to, nameExt);
      fs.writeFileSync(writePath, contents, "utf8");

      /** Has dot (eg: `.js`) */
      const ext = path.extname(nameExt);
      const nameNoExt = path.basename(nameExt, ext);

      const flyyerEntry = nameNoExt;
      const flyyerEntryExt = nameNoExt + ext;
      if (["react", "react-typescript"].includes(engine)) {
        if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
          const flyyerHTMLName = path.basename(writePath, ext);
          const flyyerHTMLNameExt = flyyerHTMLName + ".html";
          const flyyerHTMLPath = path.join(path.dirname(writePath), flyyerHTMLNameExt);

          const flyyerJSName = "flyyer-" + path.basename(writePath, ext);
          const flyyerJSNameExt = flyyerJSName + ext;
          const flyyerJSPath = path.join(path.dirname(writePath), flyyerJSNameExt);

          const flyyerVariablesName = "flyyer-" + path.basename(writePath, ext) + ".variables";
          const flyyerVariablesNameExt = flyyerVariablesName + ext;
          const flyyerVariablesPath = path.join(path.dirname(writePath), flyyerVariablesNameExt);

          const flyyerJS = dedent`
            import React, { Component, Fragment, useRef, useEffect, useState } from "react"
            import ReactDOM from "react-dom";
            import qs from "qs";
            import twemoji from "twemoji";

            import Template from "./${flyyerEntry}";

            const ALLOWED_ORIGINS = ${JSON.stringify(ALLOWED_ORIGINS)};

            ${PARSE_QS}

            function WrappedTemplate() {
              const [props, setProps] = useState(() => {
                // Set initial props.
                return PARSE_QS(window.location.search.replace("?", "") || window.location.hash.replace("#", ""));
              });
              const elementRef = useRef();

              const [error, setError] = useState(null);
              function handleError(err) {
                console.error(err);
                setError(err);
              }

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
                    case "${EVENTS_VARIABLES}": {
                      setProps(PARSE_QS(message["payload"]["query"]));
                      setError(null); // reset error
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
                  {error ? (
                    <ErrorUI className="${CLASSNAME_ERROR}" error={error} />
                  ) : (
                    <ErrorHandler onError={handleError}>
                      <Template {...props} />
                    </ErrorHandler>
                  )}
                </main>
              );
            }

            function ErrorUI({ error, style, ...props }) {
              const base = { width: "100%", height: "100%", padding: "1rem" };
              if (${JSON.stringify(NODE_ENV)} === "production") {
                return (
                  <div
                    style={{ ...base, fontSize: "1.8rem", lineHeight: "1", backgroundColor: "white", display: "flex", justifyContent: "center", alignItems: "center", ...style }}
                    data-flyyer-error={error.message}
                    {...props}
                  >
                    <span>an error has ocurred</span>
                  </div>
                );
              } else {
                return (
                  <div style={{ ...base, fontSize: "24px", backgroundColor: "black", color: "white", ...style }} {...props}>
                    <pre>{error.message}</pre>
                    <br />
                    <pre>
                      {error.stack}
                    </pre>
                  </div>
                );
              }
            }

            class ErrorHandler extends Component {
              componentDidCatch(error, errorInfo) {
                // TODO: use errorInfo.componentStack
                this.props.onError && this.props.onError(error)
              }

              render() {
                const { onError, ...props } = this.props;
                return <Fragment {...props} />;
              }
            }

            const element = document.getElementById("root");
            ReactDOM.render(<WrappedTemplate />, element);

            // See: https://parceljs.org/hmr.html
            // @ts-ignore
            if (module.hot) module.hot.accept();
          `;
          fs.writeFileSync(flyyerJSPath, flyyerJS, "utf8");

          const flyyerHTML = dedent`
            <!DOCTYPE html>

            <html>
              <head>
                ${DEFAULT_TAGS}
                <title>${flyyerJSNameExt}</title>
                <style>
                  ${GLOBAL_STYLE}
                </style>
              </head>
              <body>
                <div id="root"></div>

                <script src="./${flyyerJSNameExt}"></script>
              </body>
            </html>
          `;
          fs.writeFileSync(flyyerHTMLPath, flyyerHTML, "utf8");

          const flyyerVariables = dedent`
            export async function getFlyyerSchema() {
              // @ts-ignore
              const { schema } = await import("./${flyyerEntry}");
              // @ts-ignore
              return { schema }
            };
          `;
          fs.writeFileSync(flyyerVariablesPath, flyyerVariables, "utf8");

          entries.push({
            entry: { name: nameNoExt, path: namePath },
            html: { name: flyyerHTMLName, path: flyyerHTMLPath },
            js: { name: flyyerJSName, path: flyyerJSPath },
            variables: { name: flyyerVariablesName, path: flyyerVariablesPath },
          });
        }
      } else if (["vue", "vue-typescript"].includes(engine)) {
        if ([".vue"].includes(ext)) {
          const flyyerHTMLName = path.basename(writePath, ext);
          const flyyerHTMLNameExt = flyyerHTMLName + ".html";
          const flyyerHTMLPath = path.join(path.dirname(writePath), flyyerHTMLNameExt);

          const flyyerJSName = "flyyer-" + path.basename(writePath, ext);
          const flyyerJSNameExt = flyyerJSName + ".js";
          const flyyerJSPath = path.join(path.dirname(writePath), flyyerJSNameExt);

          const flyyerVariablesName = "flyyer-" + path.basename(writePath, ext) + ".variables";
          const flyyerVariablesNameExt = flyyerVariablesName + ".js";
          const flyyerVariablesPath = path.join(path.dirname(writePath), flyyerVariablesNameExt);

          // TODO: Add error UI, class and data attribute.
          const flyyerJS = dedent`
            import Vue from "vue";
            import qs from "qs";
            import twemoji from "twemoji";

            // Requires explicit .vue extension
            import Template from "./${nameExt}";

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
                    case "${EVENTS_VARIABLES}": {
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
          fs.writeFileSync(flyyerJSPath, flyyerJS, "utf8");

          const flyyerHTML = dedent`
            <!DOCTYPE html>

            <html>
              <head>
                ${DEFAULT_TAGS}
                <title>${flyyerJSNameExt}</title>
                <style>
                  ${GLOBAL_STYLE}
                </style>
              </head>
              <body>
                <div id="root"></div>

                <script src="./${flyyerJSNameExt}"></script>
              </body>
            </html>
          `;
          fs.writeFileSync(flyyerHTMLPath, flyyerHTML, "utf8");

          // Requires explicit .vue extension
          const flyyerVariables = dedent`
            export async function getFlyyerSchema() {
              // @ts-ignore
              const { schema } = await import("./${flyyerEntryExt}");
              // @ts-ignore
              return { schema }
            };
          `;
          fs.writeFileSync(flyyerVariablesPath, flyyerVariables, "utf8");

          entries.push({
            entry: { name: nameNoExt, path: namePath },
            html: { name: flyyerHTMLName, path: flyyerHTMLPath },
            js: { name: flyyerJSName, path: flyyerJSPath },
            variables: { name: flyyerVariablesName, path: flyyerVariablesPath },
          });
        }
      }
    }
  }
  return entries;
}
