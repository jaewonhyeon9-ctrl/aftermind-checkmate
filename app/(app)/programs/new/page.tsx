import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";
import { NewProgramForm } from "./NewProgramForm";

export default async function NewProgramPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="새 팀 만들기" subtitle="운영자가 되어 팀원을 초대할 수 있어요" />
      <div className="px-5 py-5">
        <NewProgramForm />
      </div>
    </>
  );
}
