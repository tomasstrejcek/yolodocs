import { Shell } from "../components/layout/Shell";
import { QuerySection } from "../components/reference/QuerySection";
import { MutationSection } from "../components/reference/MutationSection";
import { TypeSection } from "../components/reference/TypeSection";
import { EnumSection } from "../components/reference/EnumSection";
import { InterfaceSection } from "../components/reference/InterfaceSection";
import { UnionSection } from "../components/reference/UnionSection";
import { InputSection } from "../components/reference/InputSection";
import { ScalarSection } from "../components/reference/ScalarSection";

export default function Reference() {
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
      </div>
    </Shell>
  );
}
