import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from '@/pages/Layout'
import Dashboard from '@/pages/Dashboard'
import Upload from '@/pages/Upload'
import Calendar from '@/pages/Calendar'
import ContractDetails from '@/pages/ContractDetails'
import Pricing from '@/pages/Pricing'
import AdminSubscriptions from '@/pages/AdminSubscriptions'
import ReminderSettings from '@/pages/ReminderSettings'
import Privacy from '@/pages/Privacy'
import ArchivedContracts from '@/pages/ArchivedContracts'
import BrokerageSettings from '@/pages/BrokerageSettings'
import Landing from '@/pages/Landing'
import TeamManagement from '@/pages/TeamManagement'
import Home from '@/pages/Home'
import DebugReminders from '@/pages/DebugReminders'
import ClientUpdates from '@/pages/ClientUpdates'
import Referrals from '@/pages/Referrals'
import Organizations from '@/pages/Organizations'
import Profile from '@/pages/Profile'
import TimelineGenerator from '@/pages/TimelineGenerator'
import Settings from '@/pages/Settings'
import { ProtectedRoute } from '@/components/routing/ProtectedRoute'
import { Toaster } from '@/components/ui/toaster'
import AuthLogin from '@/pages/auth/Login'
import AuthRegister from '@/pages/auth/Register'
import AuthForgot from '@/pages/auth/ForgotPassword'
import NotFound from '@/pages/NotFound'
import './App.css'

function App() {
  return (
    <div className="bg-slate-50 text-slate-900">
      <Routes>
        <Route path="/auth/login" element={<AuthLogin />} />
        <Route path="/auth/register" element={<AuthRegister />} />
        <Route path="/auth/forgot-password" element={<AuthForgot />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/" element={<Home />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/contracts/:contractId" element={<ContractDetails />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="/reminders" element={<ReminderSettings />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/contracts/archived" element={<ArchivedContracts />} />
          <Route path="/settings/brokerage" element={<BrokerageSettings />} />
          <Route path="/teams" element={<TeamManagement />} />
          <Route path="/debug/reminders" element={<DebugReminders />} />
          <Route path="/client-updates" element={<ClientUpdates />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/organizations" element={<Organizations />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/timeline" element={<TimelineGenerator />} />
          <Route path="/settings" element={<Settings />} />
          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </div>
  )
}

export default App
