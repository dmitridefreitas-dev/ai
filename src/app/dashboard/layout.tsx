import { createClient } from "@/lib/supabase/server";
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

  const { data: staff } = await supabase
    .from("staff")
    .select("name, role, clinic_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!staff) redirect("/login");

  const { data: clinic } = await supabase
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
