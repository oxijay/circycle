import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Action = {
  label: string;
  href: string;
};

export function SectionPlaceholder({
  title,
  description,
  bullets,
  actions,
}: {
  title: string;
  description: string;
  bullets: string[];
  actions: Action[];
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={action.href} asChild variant="outline">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
