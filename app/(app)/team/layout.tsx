import { TeamSubNav } from "./TeamSubNav";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TeamSubNav />
      {children}
    </>
  );
}
