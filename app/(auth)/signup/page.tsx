import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <Card className="shadow-float">
      <CardHeader>
        <CardTitle className="text-page-title">Create account</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SignupForm />
        <p className="text-body-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-text hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
