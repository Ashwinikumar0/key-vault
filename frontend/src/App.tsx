import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { AdminPage } from "./pages/AdminPage";
import { UserRole } from "./utils/api";
import { Lock } from "lucide-react";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
  Outlet,
  redirect,
} from "@tanstack/react-router";

// Initialize TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents aggressive queries refetching on window focus
      retry: false, // Simplifies auth error handling
    },
  },
});

// 1. Define Router Context
interface MyRouterContext {
  auth: {
    user: { email: string; role: UserRole } | null;
    isLoading: boolean;
    isAuthenticated: boolean;
  };
}

// 2. Create Root Route with Context
const rootRoute = createRootRouteWithContext<MyRouterContext>()({
  component: () => <Outlet />,
});

// 3. Create Child Routes with Guards
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: ({ context }) => {
    const { isAuthenticated, user } = context.auth;
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
    if (user?.role === UserRole.ADMIN) {
      throw redirect({ to: "/admin" });
    }
    throw redirect({ to: "/dashboard" });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: ({ context }) => {
    const { isAuthenticated, user } = context.auth;
    if (isAuthenticated) {
      if (user?.role === UserRole.ADMIN) {
        throw redirect({ to: "/admin" });
      }
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  beforeLoad: ({ context }) => {
    const { isAuthenticated } = context.auth;
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
  },
  component: DashboardPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  beforeLoad: ({ context }) => {
    const { isAuthenticated, user } = context.auth;
    if (!isAuthenticated) {
      throw redirect({ to: "/login" });
    }
    if (user?.role !== UserRole.ADMIN) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPage,
});

// 4. Register the Route Tree & Instantiate Router
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute,
  adminRoute,
]);

const router = createRouter({
  routeTree,
  context: {
    auth: undefined!, // Provided at runtime
  },
});

// Register router types for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

  // Fullscreen premium loading screen
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: "16px",
          backgroundImage: "radial-gradient(at 50% 50%, rgba(99, 102, 241, 0.08) 0px, transparent 50%)",
        }}
      >
        <div className="empty-icon" style={{ borderColor: "var(--primary)", animation: "pulseGlow 2s infinite" }}>
          <Lock size={32} style={{ color: "var(--primary)" }} />
        </div>
        <span style={{ color: "var(--text-muted)", fontSize: "14px", fontWeight: 500 }}>
          Initializing Security Context...
        </span>
      </div>
    );
  }

  return (
    <RouterProvider
      router={router}
      context={{
        auth: {
          user,
          isLoading,
          isAuthenticated: !!user,
        },
      }}
    />
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
