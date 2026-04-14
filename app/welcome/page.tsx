import { Suspense } from "react";
import WelcomeContent from "./welcome-content";

export default function WelcomePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="text-center">Loading...</div></div>}>
      <WelcomeContent />
    </Suspense>
  );
}
