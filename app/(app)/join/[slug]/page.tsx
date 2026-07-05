import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JoinProgramCard } from "./JoinProgramCard";

export default async function JoinProgramPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  const program = await prisma.program.findUnique({ where: { slug } });
  if (!program || !program.isActive) notFound();

  const membership = await prisma.membership.findUnique({
    where: { userId_programId: { userId: user.id, programId: program.id } },
  });

  if (membership?.status === "ACTIVE") redirect("/today");

  return (
    <>
      <PageHeader title="팀 가입" subtitle={program.name} />
      <div className="px-5 py-5">
        <JoinProgramCard
          programId={program.id}
          programName={program.name}
          status={membership?.status === "PENDING" || membership?.status === "REJECTED" ? membership.status : null}
        />
      </div>
    </>
  );
}
