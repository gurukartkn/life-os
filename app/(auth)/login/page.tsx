import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Card className="shadow-float">
      <CardHeader>
        <CardTitle className="text-page-title">Log in</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <LoginForm />
        <p className="text-body-sm text-ink-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent-text hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
