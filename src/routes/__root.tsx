import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Deadlock Toolkit" },
      { name: "description", content: "Interactive toolkit to detect, prevent and recover from deadlocks with Banker's Algorithm, Resource Allocation Graphs and Coffman conditions." },
      { name: "author", content: "Deadlock Toolkit" },
      { property: "og:title", content: "Deadlock Toolkit" },
      { property: "og:description", content: "Interactive toolkit to detect, prevent and recover from deadlocks with Banker's Algorithm, Resource Allocation Graphs and Coffman conditions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Deadlock Toolkit" },
      { name: "twitter:description", content: "Interactive toolkit to detect, prevent and recover from deadlocks with Banker's Algorithm, Resource Allocation Graphs and Coffman conditions." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/edf07663-56b6-4a58-8d35-13828f7d8b48/id-preview-86b17a59--df890f00-8b13-4e08-b6e7-c03f5effe416.lovable.app-1777131332325.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/edf07663-56b6-4a58-8d35-13828f7d8b48/id-preview-86b17a59--df890f00-8b13-4e08-b6e7-c03f5effe416.lovable.app-1777131332325.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
