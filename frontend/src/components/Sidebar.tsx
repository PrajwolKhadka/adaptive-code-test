"use client";

import { usePathname, useRouter } from "next/navigation";
import { apiClient } from "@/lib/apiClient";
import { CurrentUser } from "@/lib/useCurrentUser";

interface NavLink {
  href: string;
  label: string;
}

const STUDENT_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/test", label: "Take a test" },
  { href: "/resources", label: "Resources" },
  { href: "/profile", label: "Profile" },
];

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/questions", label: "Questions" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/profile", label: "Profile" },
];

export function Sidebar({ user }: { user: CurrentUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const links = user.role === "admin" ? ADMIN_LINKS : STUDENT_LINKS;

  async function handleLogout() {
    await apiClient.post("/auth/logout");
    router.push("/login");
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-4">
        <div className="flex items-center border-b border-gray-200 px-4 py-4">
          <img
            src="/logo.png"
            alt="Adaptive Code Platform"
            className="h-9 w-auto object-contain"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <a
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </a>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 px-4 py-4">
        <p className="mb-2 truncate text-xs text-gray-500">{user.email}</p>
        <button
          onClick={handleLogout}
          className="text-xs font-medium text-gray-500 underline hover:text-gray-700"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
