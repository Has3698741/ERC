import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom"; // 👇 غيرناها لـ HashRouter
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import DepartmentEntry from "./pages/DepartmentEntry.tsx";
import OperationsRoom from "./pages/OperationsRoom.tsx";
import Joker from "./pages/Joker.tsx";
import Supervisor from "./pages/Supervisor.tsx";
import Youth from "./pages/Youth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import DataManager from "./pages/DataManager.tsx";
import Admin from "./pages/Admin.tsx";
import MissionDetail from "./pages/MissionDetail.tsx";
import VolunteerSupplyRequest from "./pages/VolunteerSupplyRequest.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" richColors closeButton />
      {/* 👇 استخدام الـ HashRouter مباشرة بيحل كل مشاكل الـ 404 على GitHub Pages */}
      <HashRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/department-entry" element={<ProtectedRoute roles={["department_entry"]}><DepartmentEntry /></ProtectedRoute>} />
            <Route path="/operations-room" element={<ProtectedRoute roles={["operations_room", "operations_supervisor"]}><OperationsRoom /></ProtectedRoute>} />
            <Route path="/joker" element={<ProtectedRoute roles={["joker"]}><Joker /></ProtectedRoute>} />
            <Route path="/supervisor" element={<ProtectedRoute roles={["operations_supervisor"]}><Supervisor /></ProtectedRoute>} />
            <Route path="/youth" element={<ProtectedRoute roles={["youth_room"]}><Youth /></ProtectedRoute>} />
            
            {/* السيستم المتكامل لطلب الإمداد ומتابعة الحالات والمقابلات */}
            <Route path="/volunteer-supply-request" element={<ProtectedRoute><VolunteerSupplyRequest /></ProtectedRoute>} />
            <Route path="/new-supply-request" element={<ProtectedRoute><VolunteerSupplyRequest /></ProtectedRoute>} />
            
            <Route path="/dashboard" element={<ProtectedRoute roles={["stakeholder", "data_manager"]}><Dashboard /></ProtectedRoute>} />
            <Route path="/data-manager" element={<ProtectedRoute roles={["data_manager"]}><DataManager /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><Admin /></ProtectedRoute>} />
            <Route path="/missions/:id" element={<ProtectedRoute><MissionDetail /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;