import { z } from "zod";
declare const ConfigSchema: z.ZodObject<{
    schema: z.ZodOptional<z.ZodString>;
    introspectionUrl: z.ZodOptional<z.ZodString>;
    introspectionFile: z.ZodOptional<z.ZodString>;
    introspectionHeaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    title: z.ZodDefault<z.ZodString>;
    description: z.ZodDefault<z.ZodString>;
    version: z.ZodOptional<z.ZodString>;
    logo: z.ZodOptional<z.ZodString>;
    favicon: z.ZodOptional<z.ZodString>;
    endpoint: z.ZodOptional<z.ZodString>;
    playgroundHeaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    docsDir: z.ZodDefault<z.ZodString>;
    output: z.ZodDefault<z.ZodString>;
    hideDeprecated: z.ZodDefault<z.ZodBoolean>;
    hideInternalTypes: z.ZodDefault<z.ZodBoolean>;
    showDescriptions: z.ZodDefault<z.ZodBoolean>;
    expandExampleDepth: z.ZodDefault<z.ZodNumber>;
    groups: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        operations: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        operations: string[];
    }, {
        name: string;
        operations: string[];
    }>, "many">>;
    base: z.ZodDefault<z.ZodString>;
    dev: z.ZodDefault<z.ZodBoolean>;
    serve: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description: string;
    docsDir: string;
    output: string;
    hideDeprecated: boolean;
    hideInternalTypes: boolean;
    showDescriptions: boolean;
    expandExampleDepth: number;
    base: string;
    dev: boolean;
    serve: boolean;
    schema?: string | undefined;
    introspectionUrl?: string | undefined;
    introspectionFile?: string | undefined;
    introspectionHeaders?: Record<string, string> | undefined;
    version?: string | undefined;
    logo?: string | undefined;
    favicon?: string | undefined;
    endpoint?: string | undefined;
    playgroundHeaders?: Record<string, string> | undefined;
    groups?: {
        name: string;
        operations: string[];
    }[] | undefined;
}, {
    schema?: string | undefined;
    introspectionUrl?: string | undefined;
    introspectionFile?: string | undefined;
    introspectionHeaders?: Record<string, string> | undefined;
    title?: string | undefined;
    description?: string | undefined;
    version?: string | undefined;
    logo?: string | undefined;
    favicon?: string | undefined;
    endpoint?: string | undefined;
    playgroundHeaders?: Record<string, string> | undefined;
    docsDir?: string | undefined;
    output?: string | undefined;
    hideDeprecated?: boolean | undefined;
    hideInternalTypes?: boolean | undefined;
    showDescriptions?: boolean | undefined;
    expandExampleDepth?: number | undefined;
    groups?: {
        name: string;
        operations: string[];
    }[] | undefined;
    base?: string | undefined;
    dev?: boolean | undefined;
    serve?: boolean | undefined;
}>;
export type YolodocsConfig = z.infer<typeof ConfigSchema>;
export declare function loadConfig(cliOptions: Record<string, unknown>): Promise<YolodocsConfig>;
export {};
//# sourceMappingURL=config.d.ts.map