function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrap(cls: string, text: string): string {
  return `<span class="syn-${cls}">${text}</span>`;
}

// ---------- GraphQL tokenizer ----------

const GQL_KEYWORDS = new Set([
  "query", "mutation", "subscription", "fragment", "on",
  "type", "input", "enum", "interface", "union", "scalar",
  "schema", "extend", "implements", "directive", "repeatable",
]);

const GQL_BUILTINS = new Set(["String", "Int", "Float", "Boolean", "ID"]);

interface Token { text: string; cls: string | null; }

function tokenizeGraphQL(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = code.length;

  while (i < len) {
    // Comments
    if (code[i] === "#") {
      let end = code.indexOf("\n", i);
      if (end === -1) end = len;
      tokens.push({ text: code.slice(i, end), cls: "comment" });
      i = end;
      continue;
    }

    // Strings (double-quoted only in GraphQL)
    if (code[i] === '"') {
      // Triple-quoted (block) strings
      if (code.slice(i, i + 3) === '"""') {
        let end = code.indexOf('"""', i + 3);
        if (end === -1) end = len - 3;
        end += 3;
        tokens.push({ text: code.slice(i, end), cls: "string" });
        i = end;
        continue;
      }
      let j = i + 1;
      while (j < len && code[j] !== '"' && code[j] !== "\n") {
        if (code[j] === "\\") j++; // skip escaped char
        j++;
      }
      if (j < len) j++; // include closing quote
      tokens.push({ text: code.slice(i, j), cls: "string" });
      i = j;
      continue;
    }

    // Directives (@deprecated, @skip, etc.)
    if (code[i] === "@") {
      let j = i + 1;
      while (j < len && /\w/.test(code[j])) j++;
      tokens.push({ text: code.slice(i, j), cls: "directive" });
      i = j;
      continue;
    }

    // Variables ($id, $input, etc.)
    if (code[i] === "$") {
      let j = i + 1;
      while (j < len && /\w/.test(code[j])) j++;
      tokens.push({ text: code.slice(i, j), cls: "variable" });
      i = j;
      continue;
    }

    // Spread operator (...)
    if (code.slice(i, i + 3) === "...") {
      tokens.push({ text: "...", cls: "keyword" });
      i += 3;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(code[i]) || (code[i] === "-" && i + 1 < len && /[0-9]/.test(code[i + 1]))) {
      let j = i;
      if (code[j] === "-") j++;
      while (j < len && /[0-9]/.test(code[j])) j++;
      if (j < len && code[j] === ".") {
        j++;
        while (j < len && /[0-9]/.test(code[j])) j++;
      }
      if (j < len && (code[j] === "e" || code[j] === "E")) {
        j++;
        if (j < len && (code[j] === "+" || code[j] === "-")) j++;
        while (j < len && /[0-9]/.test(code[j])) j++;
      }
      tokens.push({ text: code.slice(i, j), cls: "number" });
      i = j;
      continue;
    }

    // Words (identifiers, keywords, types)
    if (/[a-zA-Z_]/.test(code[i])) {
      let j = i + 1;
      while (j < len && /\w/.test(code[j])) j++;
      const word = code.slice(i, j);

      if (GQL_KEYWORDS.has(word)) {
        tokens.push({ text: word, cls: "keyword" });
      } else if (GQL_BUILTINS.has(word)) {
        tokens.push({ text: word, cls: "type" });
      } else if (word === "true" || word === "false") {
        tokens.push({ text: word, cls: "boolean" });
      } else if (word === "null") {
        tokens.push({ text: word, cls: "null" });
      } else if (word[0] >= "A" && word[0] <= "Z") {
        // PascalCase = likely a type name
        tokens.push({ text: word, cls: "type" });
      } else {
        // Field names or argument names — check context
        // If followed by '(' or ':', it's a field/argument name
        let k = j;
        while (k < len && (code[k] === " " || code[k] === "\t")) k++;
        if (k < len && (code[k] === "(" || code[k] === "{")) {
          tokens.push({ text: word, cls: "field" });
        } else if (k < len && code[k] === ":") {
          tokens.push({ text: word, cls: "property" });
        } else {
          tokens.push({ text: word, cls: "field" });
        }
      }
      i = j;
      continue;
    }

    // Punctuation: { } ( ) [ ] : , = ! |
    if ("{}()[]:,=!|".includes(code[i])) {
      tokens.push({ text: code[i], cls: "punctuation" });
      i++;
      continue;
    }

    // Whitespace and anything else — pass through
    let j = i + 1;
    while (j < len && !" \t\n\r#\"@${}()[]:,=!|0123456789".includes(code[j]) && !/[a-zA-Z_.]/.test(code[j])) {
      j++;
    }
    // Collect whitespace runs
    if (code[i] === " " || code[i] === "\t" || code[i] === "\n" || code[i] === "\r") {
      while (j < len && (code[j] === " " || code[j] === "\t" || code[j] === "\n" || code[j] === "\r")) j++;
    }
    tokens.push({ text: code.slice(i, j), cls: null });
    i = j;
  }

  return tokens;
}

export function highlightGraphQL(code: string): string {
  const tokens = tokenizeGraphQL(code);
  return tokens.map((t) => {
    const escaped = escapeHtml(t.text);
    return t.cls ? wrap(t.cls, escaped) : escaped;
  }).join("");
}

// ---------- JSON tokenizer ----------

function tokenizeJSON(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = code.length;

  // Track whether we expect a key or value
  // After { or , at object level → key; after : → value
  const contextStack: ("object" | "array")[] = [];
  let expectKey = false;

  while (i < len) {
    // Whitespace
    if (code[i] === " " || code[i] === "\t" || code[i] === "\n" || code[i] === "\r") {
      let j = i + 1;
      while (j < len && (code[j] === " " || code[j] === "\t" || code[j] === "\n" || code[j] === "\r")) j++;
      tokens.push({ text: code.slice(i, j), cls: null });
      i = j;
      continue;
    }

    // Strings
    if (code[i] === '"') {
      let j = i + 1;
      while (j < len && code[j] !== '"') {
        if (code[j] === "\\") j++;
        j++;
      }
      if (j < len) j++; // include closing quote
      const str = code.slice(i, j);

      if (expectKey) {
        tokens.push({ text: str, cls: "property" });
      } else {
        tokens.push({ text: str, cls: "string" });
      }
      expectKey = false;
      i = j;
      continue;
    }

    // Braces
    if (code[i] === "{") {
      tokens.push({ text: "{", cls: "punctuation" });
      contextStack.push("object");
      expectKey = true;
      i++;
      continue;
    }
    if (code[i] === "}") {
      tokens.push({ text: "}", cls: "punctuation" });
      contextStack.pop();
      expectKey = false;
      i++;
      continue;
    }
    if (code[i] === "[") {
      tokens.push({ text: "[", cls: "punctuation" });
      contextStack.push("array");
      expectKey = false;
      i++;
      continue;
    }
    if (code[i] === "]") {
      tokens.push({ text: "]", cls: "punctuation" });
      contextStack.pop();
      expectKey = false;
      i++;
      continue;
    }

    // Colon
    if (code[i] === ":") {
      tokens.push({ text: ":", cls: "punctuation" });
      expectKey = false;
      i++;
      continue;
    }

    // Comma
    if (code[i] === ",") {
      tokens.push({ text: ",", cls: "punctuation" });
      // After comma in object → next string is a key
      const ctx = contextStack[contextStack.length - 1];
      expectKey = ctx === "object";
      i++;
      continue;
    }

    // Numbers
    if (code[i] === "-" || (code[i] >= "0" && code[i] <= "9")) {
      let j = i;
      if (code[j] === "-") j++;
      while (j < len && code[j] >= "0" && code[j] <= "9") j++;
      if (j < len && code[j] === ".") {
        j++;
        while (j < len && code[j] >= "0" && code[j] <= "9") j++;
      }
      if (j < len && (code[j] === "e" || code[j] === "E")) {
        j++;
        if (j < len && (code[j] === "+" || code[j] === "-")) j++;
        while (j < len && code[j] >= "0" && code[j] <= "9") j++;
      }
      tokens.push({ text: code.slice(i, j), cls: "number" });
      i = j;
      continue;
    }

    // true / false / null
    if (code.slice(i, i + 4) === "true") {
      tokens.push({ text: "true", cls: "boolean" });
      i += 4;
      continue;
    }
    if (code.slice(i, i + 5) === "false") {
      tokens.push({ text: "false", cls: "boolean" });
      i += 5;
      continue;
    }
    if (code.slice(i, i + 4) === "null") {
      tokens.push({ text: "null", cls: "null" });
      i += 4;
      continue;
    }

    // Anything else
    tokens.push({ text: code[i], cls: null });
    i++;
  }

  return tokens;
}

export function highlightJSON(code: string): string {
  const tokens = tokenizeJSON(code);
  return tokens.map((t) => {
    const escaped = escapeHtml(t.text);
    return t.cls ? wrap(t.cls, escaped) : escaped;
  }).join("");
}

// ---------- Entry ----------

export function highlight(code: string, language: string): string {
  switch (language) {
    case "graphql":
      return highlightGraphQL(code);
    case "json":
      return highlightJSON(code);
    default:
      return escapeHtml(code);
  }
}
