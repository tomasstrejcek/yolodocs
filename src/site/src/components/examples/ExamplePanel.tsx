import { Show } from "solid-js";
import { CodeBlock } from "./CodeBlock";
import { PlaygroundToggle } from "./PlaygroundToggle";

interface OperationExample {
  query: string;
  variables: Record<string, unknown> | null;
  response: Record<string, unknown>;
}

export function ExamplePanel(props: {
  name: string;
  example: OperationExample;
}) {
  return (
    <div class="mb-8" id={`example-${props.name}`}>
      <h4 class="text-sm font-semibold text-text-primary mb-3">{props.name}</h4>

      <CodeBlock
        code={props.example.query}
        language="graphql"
        title="Query"
      />

      <Show when={props.example.variables}>
        <CodeBlock
          code={JSON.stringify(props.example.variables, null, 2)}
          language="json"
          title="Variables"
        />
      </Show>

      <CodeBlock
        code={JSON.stringify(props.example.response, null, 2)}
        language="json"
        title="Response"
      />

      <PlaygroundToggle
        name={props.name}
        query={props.example.query}
        variables={props.example.variables}
      />
    </div>
  );
}
