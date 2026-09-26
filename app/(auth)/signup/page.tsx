import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create account"
      description="One account, one person. Your data stays yours."
      footerText="Already have an account?"
      footerLinkLabel="Log in"
      footerHref="/login"
    >
      <SignupForm />
    </AuthCard>
  );
}
