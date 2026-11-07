import { NavSidebar } from "@/components/nav-sidebar";
import { apiFetchServer } from "@/lib/api-server";

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
