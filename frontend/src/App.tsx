import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ApplicationsPage } from "@/pages/ApplicationsPage";
import { ApplicationDetailPage } from "@/pages/ApplicationDetailPage";
import { AnalyticsPage } from "@/pages/AnalyticsPage";
import { TemplatesPage } from "@/pages/TemplatesPage";
import { WhatsAppConfigPage } from "@/pages/WhatsAppConfigPage";
import { AdminSettingsPage } from "@/pages/AdminSettingsPage";
import { ApplyPage } from "@/pages/ApplyPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { AdminLayout } from "@/components/layout/AdminLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ApplyPage />} />
        <Route path="/apply" element={<ApplyPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <AdminLayout>
              <DashboardPage />
            </AdminLayout>
          }
        />
        <Route
          path="/applications"
          element={
            <AdminLayout>
              <ApplicationsPage />
            </AdminLayout>
          }
        />
        <Route
          path="/applications/:id"
          element={
            <AdminLayout>
              <ApplicationDetailPage />
            </AdminLayout>
          }
        />
        <Route
          path="/analytics"
          element={
            <AdminLayout>
              <AnalyticsPage />
            </AdminLayout>
          }
        />
        <Route
          path="/templates"
          element={
            <AdminLayout>
              <TemplatesPage />
            </AdminLayout>
          }
        />
        <Route
          path="/whatsapp"
          element={
            <AdminLayout>
              <WhatsAppConfigPage />
            </AdminLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <AdminLayout>
              <AdminSettingsPage />
            </AdminLayout>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
