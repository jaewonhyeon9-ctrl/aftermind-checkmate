import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="mx-auto size-14 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 shadow-lg shadow-slate-900/20 flex items-center justify-center text-white text-xl font-bold">
          ✓
        </div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 bg-clip-text text-transparent">
          회원가입
        </h1>
        <p className="text-sm text-slate-500 font-medium">체크메이트</p>
      </div>
      <RegisterForm />
      <p className="text-sm text-center text-slate-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-slate-900 underline underline-offset-4">
          로그인
        </Link>
      </p>
    </div>
  );
}
