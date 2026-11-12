import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { Card } from "@/components/ui";
import { ChangePasswordForm } from "./change-password";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const { user } = await requireUser();
  return (
    <main className="mx-auto max-w-md space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" aria-label="My events"><Logo size={26} /></Link>
        <Link href="/dashboard" className="text-sm underline">My events</Link>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Your account</h1>
      <Card title="Change password">
        <p className="mb-4 text-sm text-stone-500">Logged in as {user.email}</p>
        <ChangePasswordForm />
      </Card>
    </main>
  );
}
