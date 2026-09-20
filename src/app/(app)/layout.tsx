import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Rail } from "@/components/app/rail";
import { TabBar } from "@/components/app/tab-bar";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "·";
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const name = (data.user.user_metadata?.full_name as string | undefined) || data.user.email || "";

  return (
    <div className="flex h-dvh overflow-hidden">
      <Rail initials={initialsOf(name)} />
      <div className="flex min-w-0 flex-1 flex-col">
        {children}
        <TabBar />
      </div>
    </div>
  );
}
