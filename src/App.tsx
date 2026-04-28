import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ChatProvider } from "@/components/ChatProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { SOSButton } from "@/components/SOSButton";
import Home from "./pages/Home";
import About from "./pages/About";
import Team from "./pages/Team";
import Services from "./pages/Services";
import Blogs from "./pages/Blogs";
import Contact from "./pages/Contact";
import FAQs from "./pages/FAQs";
import PsychologistProfile from "./pages/PsychologistProfile";
import TherapistDashboard from "./pages/TherapistDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import AdminDashboard from "./pages/AdminDashboard";
import GroupTherapy from "./pages/GroupTherapy";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotificationsPage from "./pages/NotificationsPage";
import ChooseService from "./pages/ChooseService";
import GroupTherapyDetail from "./pages/GroupTherapyDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
          <ConfirmProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/team" element={<Team />} />
            <Route path="/services" element={<Services />} />
            <Route path="/blogs" element={<Blogs />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faqs" element={<FAQs />} />
            <Route path="/psychologist/:id" element={<PsychologistProfile />} />
            <Route path="/therapist-dashboard" element={<TherapistDashboard />} />
            <Route path="/client-dashboard" element={<ClientDashboard />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/group-therapy" element={<GroupTherapy />} />
            <Route path="/group-therapy/:id" element={<GroupTherapyDetail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/choose-service" element={<ChooseService />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <SOSButton />
          </ConfirmProvider>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
