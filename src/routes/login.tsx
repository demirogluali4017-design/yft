import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Giris, MarkaBekleme } from "@/components/giris";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <MarkaBekleme />;
  if (user) return <Navigate to="/" />;
  return <Giris />;
}
