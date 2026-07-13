import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";

export default async function SetPasswordPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <Suspense fallback={<div style={{ height: 300, borderRadius: 16, background: "white" }} />}>
      <SetPasswordForm />
    </Suspense>
  );
}