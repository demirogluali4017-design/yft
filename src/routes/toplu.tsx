import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/shell";

export const Route = createFileRoute("/toplu")({ component: Page });

function Page() {
  return (
    <AppShell need="zimmet">
      <h1 className="font-display text-4xl font-semibold">Toplu zimmet</h1>
    </AppShell>
  );
}
