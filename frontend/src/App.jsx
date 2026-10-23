import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import UserType from "./pages/UserType";
import PersonalDetails from "./pages/PersonalDetails";
import EmergencyContacts from "./pages/EmergencyContacts";
import CaregiverDetails from "./pages/CaregiverDetails";
import AdditionalDetails from "./pages/AdditionalDetails";
import Dashboard from "./pages/Dashboard";
import Assistant from "./pages/Assistant";
import Medicines from "./pages/Medicines";
import Appointments from "./pages/Appointments";
import Timeline from "./pages/Timeline";
import CaregiverDashboard from "./pages/CaregiverDashboard";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import FindThings from "./pages/FindThings";
import FindPeople from "./pages/FindPeople";

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding/user-type" element={<UserType />} />
            <Route path="/onboarding/personal-details" element={<PersonalDetails />} />
            <Route path="/onboarding/emergency-contacts" element={<EmergencyContacts />} />
            <Route path="/onboarding/caregiver-details" element={<CaregiverDetails />} />
            <Route path="/onboarding/additional-details" element={<AdditionalDetails />} />

            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/medicines" element={<Medicines />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/caregiver" element={<CaregiverDashboard />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/find-my-people" element={<FindPeople />} />
              <Route path="/find-things" element={<FindThings />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppProvider>
    </AuthProvider>
  );
}
