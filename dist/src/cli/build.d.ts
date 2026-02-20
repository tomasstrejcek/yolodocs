import type { YolodocsConfig } from "./config.js";
import type { NavigationManifest, ParsedSchema } from "../schema/types.js";
export declare function build(config: YolodocsConfig): Promise<void>;
export declare function toTitleCase(s: string): string;
export declare function buildNavigationManifest(schema: ParsedSchema, docsManifest: {
    pages: Array<{
        slug: string;
        title: string;
        category: string;
        order: number;
    }>;
}, base: string): NavigationManifest;
//# sourceMappingURL=build.d.ts.map