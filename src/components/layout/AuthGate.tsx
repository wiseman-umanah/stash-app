import { Navigate, Outlet, useLocation } from "react-router";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { useMe } from "@/hooks/queries";
import { AppShell } from "./AppShell";

/** Signed-in area: sends logged-out visitors to /login, then back where they were. */
export function RequireAuth() {
  const me = useMe();
  const location = useLocation();
  if (me.isPending) return null;
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return (
    <ChatProvider>
      <AppShell wide />
    </ChatProvider>
  );
}

/** Welcome / signup / login: already signed-in owners go straight to the dashboard. */
export function PublicOnly() {
  const me = useMe();
  if (me.isPending) return null;
  if (me.data) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
