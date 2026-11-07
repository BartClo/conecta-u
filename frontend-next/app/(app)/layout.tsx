import { NavSidebar } from "@/components/nav-sidebar";
import { apiFetchServer } from "@/lib/api-server";

// Every route in this group is authenticated and renders per-user data from
// the backend, so none of it can be prerendered statically.
export const dynamic = "force-dynamic";

interface Me {
  name: string | null;
  email: string;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await apiFetchServer<Me>("/api/me");

  return (
    <div className="flex">
      <NavSidebar userName={me.name} userEmail={me.email} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
