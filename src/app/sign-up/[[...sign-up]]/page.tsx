import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <div className="mb-8">
        <Logo href="/" height={36} />
      </div>
      <SignUp fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
