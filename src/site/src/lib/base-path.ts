import siteConfig from "../data/site-config.json";

export const base = (siteConfig as any).base || "";
export const withBase = (path: string) => base + path;
