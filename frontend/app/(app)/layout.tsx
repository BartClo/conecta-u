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
    <div className="flex min-h-screen">
      <NavSidebar userName={me.name} userEmail={me.email} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-7">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
