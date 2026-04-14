import { Suspense } from "react";
import UpgradePageContent from "./upgrade-content";

export default function UpgradePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UpgradePageContent />
    </Suspense>
  );
}
