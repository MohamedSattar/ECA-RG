import "./global.css";
import "./i18n/config";

import { Toaster } from "@/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/ui/sonner";
import { TooltipProvider } from "@/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SiteLayout } from "@/layout/SiteLayout";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./state/azureConfig";
import { PublicClientApplication } from "@azure/msal-browser";
import React, { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "./state/auth";
import { ThemeProvider } from "@fluentui/react";
import myTheme from "./styles/flunetUITheme";
import ApplicationsNew from "./pages/ApplicationsNew";
import GrantDetail from "./pages/GrantDetail";
import Profile from "./pages/Profile";

// Lazy load page components
const Login = lazy(() => import("./pages/Login"));
const Researches = lazy(() => import("./pages/Researches"));
const Applications = lazy(() => import("./pages/Applications"));
const Submissions = lazy(() => import("./pages/Submissions"));
const FormResearch = lazy(() => import("./pages/FormResearch"));
const FormApplication = lazy(() => import("./pages/FormApplication"));
const Notifications = lazy(() => import("./pages/Notifications"));

const queryClient = new QueryClient();

const pca = new PublicClientApplication(msalConfig);

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthed, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="loader">Loading...</div>
      </div>
    );
  }

  return isAuthed ? children : <Login />;
};

const App = () => (
  <MsalProvider instance={pca}>
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={myTheme}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SiteLayout>
                <Suspense
                  fallback={
                    <div className="container py-16 text-center">
                      Loading...
                    </div>
                  }
                >
                  <Routes>
                    <Route path="" element={<Index />} />
                    <Route path="/" element={<Index />} />
                    <Route path="/grantdetail/:id" element={<GrantDetail />} />
                    <Route path="/login" element={<Login />} />

                    {/* Protected Routes */}
                    <Route
                      path="/notifications"
                      element={
                        <ProtectedRoute>
                          <Notifications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/applyapplication"
                      element={
                        <ProtectedRoute>
                          <FormApplication />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/researches"
                      element={
                        <ProtectedRoute>
                          <Researches />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/applications"
                      element={
                        <ProtectedRoute>
                          <Applications />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/submissions"
                      element={
                        <ProtectedRoute>
                          <Submissions />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/applyresearch"
                      element={
                        <ProtectedRoute>
                          <FormResearch />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/applicationsnew"
                      element={
                        <ProtectedRoute>
                          <ApplicationsNew />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/updateprofile"
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </SiteLayout>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  </MsalProvider>
);

const container = document.getElementById("spa-root")!;

// Initialize MSAL before rendering
await pca.initialize().then(() => {
  // Ensure idempotent mounting across HMR reloads
  const existingRoot = (window as any).__appRoot as ReturnType<typeof createRoot> | undefined;
  const root = existingRoot ?? createRoot(container);
  (window as any).__appRoot = root;
  root.render(<App />);
});