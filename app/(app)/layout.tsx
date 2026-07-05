import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentMembership } from "@/lib/program";
import { BottomNav } from "@/components/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // 과정이 아직 없는 유저(예: 방금 가입해서 /programs/new로 향하는 중)도 레이아웃은 렌더돼야 하므로 리다이렉트하지 않는다.
  const membership = await getCurrentMembership(user.id);

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 max-w-md w-full mx-auto pb-20">{children}</main>
      <BottomNav isOperator={membership?.role === "OPERATOR"} />
    </div>
  );
}
