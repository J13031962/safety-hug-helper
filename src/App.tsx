import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAutoUpdate } from "@/hooks/useAutoUpdate";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import Plataforma from "./pages/Plataforma";
import AdminPanel from "./pages/AdminPanel";
import OperatorDashboard from "./pages/OperatorDashboard";

const queryClient = new QueryClient();

const AutoUpdater = () => {
  useAutoUpdate();
  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AutoUpdater />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/configuracion" element={<SettingsPage />} />
              <Route path="/plataforma" element={<Plataforma />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/operador" element={<OperatorDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
