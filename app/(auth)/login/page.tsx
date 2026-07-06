import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto size-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 shadow-lg shadow-slate-900/20 flex items-center justify-center text-white text-xl font-bold">
          ✓
        </div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
          체크메이트
        </h1>
        <p className="text-sm text-slate-500 font-medium">매일 한 발씩</p>
      </div>
      <LoginForm />
      <p className="text-sm text-center text-slate-500">
        아직 계정이 없으신가요?{" "}
        <Link href="/register" className="font-semibold text-slate-900 underline underline-offset-4">
          회원가입
        </Link>
      </p>
    </div>
  );
}
