import { Suspense } from "react";
import { SignupFlow } from "@/components/auth/SignupFlow";

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ height:400, background:"white", borderRadius:16, border:"1px solid #e5e7eb" }} />}>
      <SignupFlow />
    </Suspense>
  );
}