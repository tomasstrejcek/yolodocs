import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import siteConfig from "./data/site-config.json";

export default function App() {
  return (
    <Router
      base={(siteConfig as any).base || ""}
      root={(props) => <Suspense>{props.children}</Suspense>}
    >
      <FileRoutes />
    </Router>
  );
}
