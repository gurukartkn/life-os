import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-surface-050 p-8">
      <h1 className="text-page-title text-ink">Life OS</h1>
      <Card className="w-full max-w-sm shadow-float">
        <CardHeader>
          <CardTitle className="text-heading">Stage 0 — Project Setup</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-body text-ink-muted">
            Next.js, Tailwind, and the design tokens are wired up.
          </p>
          <p className="text-stat-xl text-ink">0/6</p>
          <Progress value={0} />
          <Button>Add todo</Button>
        </CardContent>
      </Card>
    </div>
  );
}
