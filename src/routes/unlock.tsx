import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { getCurrentUser } from "@/lib/tenet/types";

export const Route = createFileRoute("/unlock")({
  head: () => ({ meta: [{ title: "Tenet" }] }),
  component: UnlockRedirect,
});

function UnlockRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: getCurrentUser() ? "/home" : "/identity", replace: true });
  }, [navigate]);
  return null;
}
