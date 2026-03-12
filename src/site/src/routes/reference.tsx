import { onMount, Show } from "solid-js";
import { Shell } from "../components/layout/Shell";
import { QuerySection } from "../components/reference/QuerySection";
import { MutationSection } from "../components/reference/MutationSection";
import { TypeSection } from "../components/reference/TypeSection";
import { EnumSection } from "../components/reference/EnumSection";
import { InterfaceSection } from "../components/reference/InterfaceSection";
import { UnionSection } from "../components/reference/UnionSection";
import { InputSection } from "../components/reference/InputSection";
import { ScalarSection } from "../components/reference/ScalarSection";
import siteConfig from "../data/site-config.json";

export default function Reference() {
  const cfg = siteConfig as any;

  onMount(() => {
    const hash = window.location.hash;
    if (hash) {
      // Defer to let the DOM render fully before scrolling
      requestAnimationFrame(() => {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: "instant" });
        }
      });
    }
  });

  return (
    <Shell>
      <div>
        <QuerySection />
        <MutationSection />
        <TypeSection />
        <EnumSection />
        <InterfaceSection />
        <UnionSection />
        <InputSection />
        <ScalarSection />
        <div class="px-6 py-8 text-sm text-text-muted text-center space-y-1">
          <p>
            Generated with <a href="https://github.com/tomasstrejcek/yolodocs" target="_blank" rel="noopener" class="hover:text-text-secondary underline">yolodocs</a>
            <Show when={cfg.yolodocsVersion}>{" "}v{cfg.yolodocsVersion}</Show>
          </p>
          <Show when={cfg.generatedAt}>
            <p>{new Date(cfg.generatedAt).toLocaleString()}</p>
          </Show>
        </div>
      </div>
    </Shell>
  );
}
