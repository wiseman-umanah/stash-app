import { Navigate, Route, Routes } from "react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PublicOnly, RequireAuth } from "@/components/layout/AuthGate";
import { ChatLayout } from "@/components/layout/ChatLayout";
import { useMe } from "@/hooks/queries";
import BankPage from "@/pages/Bank";
import BarcodePage from "@/pages/Barcode";
import CameraPage from "@/pages/Camera";
import DashboardPage from "@/pages/Dashboard";
import DebtsPage from "@/pages/Debts";
import ExpensesPage from "@/pages/Expenses";
import InvoicesPage from "@/pages/Invoices";
import LoginPage from "@/pages/Login";
import MenuPage from "@/pages/Menu";
import NotFoundPage from "@/pages/NotFound";
import PrivacyPage from "@/pages/Privacy";
import ProductsPage from "@/pages/Products";
import ProfilePage from "@/pages/Profile";
import ReferralsPage from "@/pages/Referrals";
import ReportsPage from "@/pages/Reports";
import SalesPage from "@/pages/Sales";
import SignupPage from "@/pages/Signup";
import StockPage from "@/pages/Stock";
import StockRecordsPage from "@/pages/StockRecords";
import SuppliersPage from "@/pages/Suppliers";
import TermsPage from "@/pages/Terms";
import WelcomePage from "@/pages/Welcome";

/** Entry point: onboarding the first time, the dashboard after that. */
function EntryRedirect() {
  const me = useMe();
  if (me.isPending) return null;
  return <Navigate to={me.data ? "/dashboard" : "/welcome"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<EntryRedirect />} />

        {/* logged-out only */}
        <Route element={<PublicOnly />}>
          <Route path="welcome" element={<WelcomePage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route path="login" element={<LoginPage />} />
        </Route>

        {/* readable by anyone */}
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />

        <Route path="chat" element={<Navigate to="/dashboard?openChat=1" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

        {/* signed-in app */}
      <Route element={<RequireAuth />}>
        <Route path="menu" element={<MenuPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="camera" element={<CameraPage />} />

        {/* business pages — share the pullable chatbox */}
        <Route element={<ChatLayout />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="stockrecords" element={<StockRecordsPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="sales" element={<SalesPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="debts" element={<DebtsPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="barcode" element={<BarcodePage />} />
          <Route path="bank" element={<BankPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
