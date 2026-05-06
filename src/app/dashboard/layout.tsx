import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "./sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const serviceClient = createServiceClient();
  const { data: staff } = await serviceClient
    .from("staff")
    .select("name, role, clinic_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!staff) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">No staff account found for your login. Please contact your administrator.</p>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-sky-500 hover:text-sky-600 text-sm">Sign out</button>
          </form>
        </div>
      </div>
    );
  }

  const { data: clinic } = await serviceClient
    .from("clinics")
    .select("name")
    .eq("id", staff.clinic_id)
    .single();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        clinicName={clinic?.name || "Clinic"}
        staffName={staff.name}
        staffRole={staff.role}
      />
      <main className="flex-1 overflow-auto">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
