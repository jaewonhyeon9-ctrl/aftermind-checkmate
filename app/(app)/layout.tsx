import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 max-w-md w-full mx-auto pb-20">{children}</main>
      <BottomNav isOperator={user.role === "OPERATOR"} />
    </div>
  );
}
