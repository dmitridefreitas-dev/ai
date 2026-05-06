"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "H" },
  { href: "/dashboard/calls", label: "Call Log", icon: "C" },
  { href: "/dashboard/patients", label: "Patients", icon: "P" },
  { href: "/dashboard/messages", label: "Messages", icon: "M" },
  { href: "/dashboard/settings", label: "Settings", icon: "S" },
];

export function Sidebar({
  clinicName,
  staffName,
  staffRole,
}: {
  clinicName: string;
  staffName: string;
  staffRole: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="font-bold text-lg text-sky-600">AI Receptionist</h1>
        <p className="text-sm text-gray-500 truncate">{clinicName}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sky-50 text-sky-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span
                className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                  isActive
                    ? "bg-sky-100 text-sky-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{staffName}</p>
            <p className="text-xs text-gray-500 capitalize">{staffRole}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
