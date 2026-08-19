import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import siteConfig from "./data/site-config.json";
import { transformUrl } from "./lib/urls";

export default function App() {
  return (
    <Router
      base={(siteConfig as any).base || ""}
      transformUrl={transformUrl}
      root={(props) => <Suspense>{props.children}</Suspense>}
    >
      <FileRoutes />
    </Router>
  );
}
