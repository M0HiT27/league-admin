"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { adminLoginService } from "@/api/client/services/admin.login";
import {
  LayoutDashboard,
  Gamepad2,
  Ticket,
  Home,
  Tag,
  ShoppingCart,
  LogOut,
} from "lucide-react";

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { path: "/home", label: "Home", icon: Home },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/games", label: "Games", icon: Gamepad2 },
    { path: "/passes", label: "Passes", icon: Ticket },
    { path: "/pass-offers", label: "Pass Offers", icon: Tag },
    { path: "/purchases", label: "Purchases", icon: ShoppingCart },
  ];

  const handleLogout = async () => {
    await adminLoginService.logoutAdmin();
    router.push("/login");
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen shrink-0">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-wide">
          AdminPanel
        </h1>
      </div>
      <nav className="flex-1 py-6 flex flex-col gap-1 px-3 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive =
            pathname === item.path || pathname?.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? "bg-blue-600 text-white font-medium"
                  : "hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
};
