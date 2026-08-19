import type { YolodocsConfig } from "./config.js";
import type { NavigationManifest, ParsedSchema } from "../schema/types.js";
/**
 * True for prerendered pages of non-HTML routes, e.g. `docs.json.html`.
 *
 * Nitro's crawlLinks follows the in-page links to `/docs.json` and `/<slug>.md`
 * and writes an SPA shell at `<link>.html`, which renders "Page Not Found" and
 * would otherwise be a search hit.
 */
export declare function isStrayDataPage(relPath: string): boolean;
/**
 * Serialize one doc page's markdown into a JS module for the site bundle.
 *
 * Vite/vinxi and Nitro substitute build tokens like `process.env.NODE_ENV` and
 * `import.meta.env.DEV` TEXTUALLY, with no regard for string literals. A page
 * whose markdown merely mentions such a token gets it rewritten inside its own
 * module: during the Nitro prerender pass `process.env.NODE_ENV` becomes
 * `"prerender"`, whose quotes terminate the literal and leave invalid JS behind.
 * The build then dies far from the cause, with a bogus
 * `Expected ";" but found "prerender"` in `.vinxi/build/ssr/assets/<page>.js`.
 * Before that surfaced as a hard failure, such pages silently published the
 * substituted text (`if ("prerender" === 'production')`).
 *
 * So a page carrying one of those tokens is emitted base64-encoded and decoded
 * at runtime: base64 is `[A-Za-z0-9+/=]` only, so no token can appear in the
 * module text at any stage. Escaping the token inside the literal instead does
 * NOT work -- Vite re-prints string literals with `\u` escapes decoded, handing
 * the verbatim token back to Nitro. Pages without such a token (nearly all of
 * them) keep the plain, readable literal.
 */
export declare function serializeDocPageModule(content: string): string;
export declare function build(config: YolodocsConfig): Promise<void>;
export declare function toTitleCase(s: string): string;
export declare function buildNavigationManifest(schema: ParsedSchema, docsManifest: {
    pages: Array<{
        slug: string;
        title: string;
        category: string;
        order: number;
    }>;
}, _base?: string): NavigationManifest;
//# sourceMappingURL=build.d.ts.map