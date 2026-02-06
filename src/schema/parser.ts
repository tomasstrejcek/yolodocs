import {
  buildSchema,
  type GraphQLSchema,
  type GraphQLField,
  type GraphQLArgument,
  type GraphQLOutputType,
  type GraphQLInputType,
  type GraphQLNamedType,
  type GraphQLEnumType,
  type GraphQLObjectType,
  type GraphQLInterfaceType,
  type GraphQLUnionType,
  type GraphQLInputObjectType,
  type GraphQLScalarType,
  isObjectType,
  isEnumType,
  isInterfaceType,
  isUnionType,
  isInputObjectType,
  isScalarType,
  isNonNullType,
  isListType,
  isNamedType,
} from "graphql";
import fs from "node:fs";
import type {
  ParsedSchema,
  FieldDefinition,
  ArgumentDefinition,
  TypeRef,
  TypeDefinition,
  EnumDefinition,
  InterfaceDefinition,
  UnionDefinition,
  InputDefinition,
  ScalarDefinition,
} from "./types.js";

const BUILT_IN_SCALARS = new Set([
  "String",
  "Int",
  "Float",
  "Boolean",
  "ID",
]);

const INTERNAL_TYPE_PREFIX = "__";

export function parseSchemaFromFile(
  filePath: string,
  hideInternalTypes = true
): ParsedSchema {
  const sdl = fs.readFileSync(filePath, "utf-8");
  return parseSchemaFromSDL(sdl, hideInternalTypes);
}

export function parseSchemaFromSDL(
  sdl: string,
  hideInternalTypes = true
): ParsedSchema {
  const schema = buildSchema(sdl);
  return extractSchema(schema, hideInternalTypes);
}

function extractSchema(
  schema: GraphQLSchema,
  hideInternalTypes: boolean
): ParsedSchema {
  const queryType = schema.getQueryType();
  const mutationType = schema.getMutationType();
  const subscriptionType = schema.getSubscriptionType();

  const queries = queryType
    ? extractFields(queryType)
    : [];
  const mutations = mutationType
    ? extractFields(mutationType)
    : [];
  const subscriptions = subscriptionType
    ? extractFields(subscriptionType)
    : [];

  const typeMap = schema.getTypeMap();
  const rootTypeNames = new Set(
    [queryType, mutationType, subscriptionType]
      .filter(Boolean)
      .map((t) => t!.name)
  );

  const types: TypeDefinition[] = [];
  const enums: EnumDefinition[] = [];
  const interfaces: InterfaceDefinition[] = [];
  const unions: UnionDefinition[] = [];
  const inputs: InputDefinition[] = [];
  const scalars: ScalarDefinition[] = [];

  for (const [name, type] of Object.entries(typeMap)) {
    if (hideInternalTypes && name.startsWith(INTERNAL_TYPE_PREFIX)) continue;
    if (rootTypeNames.has(name)) continue;

    if (isObjectType(type)) {
      types.push(extractObjectType(type));
    } else if (isEnumType(type)) {
      enums.push(extractEnumType(type));
    } else if (isInterfaceType(type)) {
      interfaces.push(extractInterfaceType(type, schema));
    } else if (isUnionType(type)) {
      unions.push(extractUnionType(type));
    } else if (isInputObjectType(type)) {
      inputs.push(extractInputType(type));
    } else if (isScalarType(type) && !BUILT_IN_SCALARS.has(name)) {
      scalars.push(extractScalarType(type));
    }
  }

  // Sort alphabetically
  types.sort((a, b) => a.name.localeCompare(b.name));
  enums.sort((a, b) => a.name.localeCompare(b.name));
  interfaces.sort((a, b) => a.name.localeCompare(b.name));
  unions.sort((a, b) => a.name.localeCompare(b.name));
  inputs.sort((a, b) => a.name.localeCompare(b.name));
  scalars.sort((a, b) => a.name.localeCompare(b.name));

  return {
    queries,
    mutations,
    subscriptions,
    types,
    enums,
    interfaces,
    unions,
    inputs,
    scalars,
  };
}

function extractFields(type: GraphQLObjectType): FieldDefinition[] {
  const fields = type.getFields();
  return Object.values(fields)
    .map((field) => extractField(field))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function extractField(
  field: GraphQLField<unknown, unknown>
): FieldDefinition {
  return {
    name: field.name,
    description: field.description || null,
    type: extractTypeRef(field.type),
    args: field.args.map(extractArgument),
    isDeprecated: field.deprecationReason != null,
    deprecationReason: field.deprecationReason || null,
  };
}

function extractArgument(arg: GraphQLArgument): ArgumentDefinition {
  return {
    name: arg.name,
    description: arg.description || null,
    type: extractTypeRef(arg.type),
    defaultValue:
      arg.defaultValue !== undefined
        ? JSON.stringify(arg.defaultValue)
        : null,
    isDeprecated: arg.deprecationReason != null,
    deprecationReason: arg.deprecationReason || null,
  };
}

function extractTypeRef(type: GraphQLOutputType | GraphQLInputType | import("graphql").GraphQLType): TypeRef {
  if (isNonNullType(type)) {
    return {
      name: "",
      kind: "NON_NULL",
      ofType: extractTypeRef(type.ofType),
    };
  }
  if (isListType(type)) {
    return {
      name: "",
      kind: "LIST",
      ofType: extractTypeRef(type.ofType),
    };
  }
  if (isNamedType(type)) {
    return {
      name: type.name,
      kind: getTypeKind(type),
      ofType: null,
    };
  }
  return { name: "Unknown", kind: "SCALAR", ofType: null };
}

function getTypeKind(
  type: GraphQLNamedType
): TypeRef["kind"] {
  if (isObjectType(type)) return "OBJECT";
  if (isEnumType(type)) return "ENUM";
  if (isInterfaceType(type)) return "INTERFACE";
  if (isUnionType(type)) return "UNION";
  if (isInputObjectType(type)) return "INPUT_OBJECT";
  return "SCALAR";
}

function extractObjectType(type: GraphQLObjectType): TypeDefinition {
  return {
    name: type.name,
    description: type.description || null,
    fields: extractFields(type),
    interfaces: type.getInterfaces().map((i) => i.name),
  };
}

function extractEnumType(type: GraphQLEnumType): EnumDefinition {
  return {
    name: type.name,
    description: type.description || null,
    values: type.getValues().map((v) => ({
      name: v.name,
      description: v.description || null,
      isDeprecated: v.deprecationReason != null,
      deprecationReason: v.deprecationReason || null,
    })),
  };
}

function extractInterfaceType(
  type: GraphQLInterfaceType,
  schema: GraphQLSchema
): InterfaceDefinition {
  const fields = type.getFields();
  const implementations = schema
    .getPossibleTypes(type)
    .map((t) => t.name)
    .sort();

  return {
    name: type.name,
    description: type.description || null,
    fields: Object.values(fields)
      .map(extractField)
      .sort((a, b) => a.name.localeCompare(b.name)),
    implementations,
  };
}

function extractUnionType(type: GraphQLUnionType): UnionDefinition {
  return {
    name: type.name,
    description: type.description || null,
    types: type.getTypes().map((t) => t.name).sort(),
  };
}

function extractInputType(type: GraphQLInputObjectType): InputDefinition {
  const fields = type.getFields();
  return {
    name: type.name,
    description: type.description || null,
    fields: Object.values(fields)
      .map((f) => ({
        name: f.name,
        description: f.description || null,
        type: extractTypeRef(f.type),
        defaultValue:
          f.defaultValue !== undefined
            ? JSON.stringify(f.defaultValue)
            : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function extractScalarType(type: GraphQLScalarType): ScalarDefinition {
  return {
    name: type.name,
    description: type.description || null,
  };
}
