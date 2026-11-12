"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "@/components/brand/logo";

const TABS = [["/admin", "Events"], ["/admin/users", "Users"]] as const;

export function AdminNav() {
  const path = usePathname();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href="/admin" aria-label="Super-admin home"><Mark size={30} /></Link>
        <h1 className="font-display text-3xl font-bold tracking-tight">Super-admin</h1>
      </div>
      <nav className="flex items-center gap-1 text-sm">
        {TABS.map(([href, label]) => (
          <Link key={href} href={href} className={`rounded-full px-3.5 py-1.5 ${path === href ? "bg-aubergine font-medium text-linen" : "text-stone-600 hover:bg-stone-100"}`}>{label}</Link>
        ))}
        <Link href="/dashboard" className="ml-2 text-stone-600 underline">My events</Link>
      </nav>
    </div>
  );
}
