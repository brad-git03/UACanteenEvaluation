import React, { useState } from "react";
import LandingPage from "./components/LandingPage";
import FeedbackForm from "./components/FeedbackForm";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import VerifyReceipt from "./components/VerifyReceipt"; 
import HackerSimulation from "./components/HackerSimulation";
import Login from "./components/Login";

export default function App() {
  const [currentView, setCurrentView] = useState("landing");

  const navigate = (view) => setCurrentView(view);

  return (
    <>
      {currentView === "landing" && <LandingPage navigate={navigate} />}
      
      {/* 🧑‍🎓 STUDENT LOGIN PORTAL */}
      {(currentView === "student-login" || currentView === "login") && (
        <Login navigate={navigate} />
      )}

      {/* 👨‍💼 ADMIN / STAFF LOGIN PORTAL */}
      {/* We split this out so "admin-login" explicitly opens your AdminLogin.js! */}
      {currentView === "admin-login" && (
        <AdminLogin navigate={navigate} />
      )}
      
      {/* 📝 SECURE FEEDBACK ROUTE */}
      {currentView === "feedback" && <FeedbackForm navigate={navigate} />}
      
      {/* 🛡️ ADMIN DASHBOARD ROUTE */}
      {(currentView === "admin" || currentView === "admin-dashboard") && (
        <AdminDashboard navigate={navigate} />
      )}
      
      {/* OTHER ROUTES */}
      {currentView === "verify_receipt" && <VerifyReceipt navigate={navigate} />}
      {currentView === "hacker" && <HackerSimulation navigate={navigate} />}
    </>
  );
}