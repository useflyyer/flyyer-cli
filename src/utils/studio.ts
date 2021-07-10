import qs from "qs";

const STUDIO_URL = "https://flyyer.github.io/flyyer-studio/";

export function studio(
  flags: { host: string; port: number; https: boolean },
  { template }: { template?: string } = {},
): string {
  const query: Record<string, string | number> = {
    /** This versions and onwards supports live previews */
    mode: "live",
  };
  if (flags.host !== "localhost") {
    query.host = flags.host;
  }
  if (String(flags.port) !== "7777") {
    query.port = flags.port;
  }
  if (flags.https) {
    query.protocol = "https:";
  }
  if (template) {
    query.template = template;
  }
  return STUDIO_URL + qs.stringify(query, { addQueryPrefix: true });
}
