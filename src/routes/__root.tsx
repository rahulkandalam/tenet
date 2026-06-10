import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { isAuthed, getCurrentUser, isRulebookComplete, loadRulebook } from "../lib/tenet/types";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-ink">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <div className="mt-6">
          <Link to="/home" className="text-teal hover:underline">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-ink-secondary">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 inline-flex items-center justify-center rounded-md bg-teal px-4 py-2 text-sm font-medium text-white"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Tenet — Pre-trade discipline" },
      { name: "description", content: "Check every trade against your own rules before you click send." },
      { property: "og:title", content: "Tenet — Pre-trade discipline" },
      { name: "twitter:title", content: "Tenet — Pre-trade discipline" },
      { property: "og:description", content: "Check every trade against your own rules before you click send." },
      { name: "twitter:description", content: "Check every trade against your own rules before you click send." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/91d71e83-911f-4901-ae82-5d846ead7706/id-preview-9bc60dd9--afd97389-bbba-47af-b56d-644590626f63.lovable.app-1780944384250.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/91d71e83-911f-4901-ae82-5d846ead7706/id-preview-9bc60dd9--afd97389-bbba-47af-b56d-644590626f63.lovable.app-1780944384250.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RouteGuard() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  useEffect(() => {
    const authed = isAuthed();
    const user = getCurrentUser();

    // 1. Not authed -> /unlock
    if (!authed) {
      if (pathname !== "/unlock") navigate({ to: "/unlock", replace: true });
      return;
    }
    // 2. Authed but no user -> /identity
    if (!user) {
      if (pathname !== "/identity") navigate({ to: "/identity", replace: true });
      return;
    }
    // 3. Authed + user, but no rulebook -> /welcome-tenet
    const rb = loadRulebook();
    const complete = isRulebookComplete(rb);
    const exempt = ["/welcome-tenet", "/rulebook/new", "/rulebook", "/unlock", "/identity"];
    if (!complete) {
      if (!exempt.includes(pathname)) navigate({ to: "/welcome-tenet", replace: true });
      return;
    }
    // 4. Fully set up
    if (pathname === "/" || pathname === "/unlock" || pathname === "/identity" || pathname === "/welcome-tenet") {
      navigate({ to: "/home", replace: true });
    }
  }, [pathname, navigate]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <RouteGuard />
      <Outlet />
      <Toaster position="bottom-center" richColors />
    </QueryClientProvider>
  );
}
