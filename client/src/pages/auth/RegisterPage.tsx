import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { RegisterForm } from "../../components/auth/RegisterForm";
import { authApi } from "../../api_services/auth/AuthAPIService";
import { useAuth } from "../../hooks/auth/useAuthHook";
import { AnimatedBackground } from "../../components/ui/AnimatedBackground";

export default function RegisterPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    navigate(user.role === "admin" ? "/admin" : "/dashboard");
  }, [isAuthenticated, user, navigate]);

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", position: "relative" }}>
      <AnimatedBackground particles={22} />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="pg-glass"
        style={{ padding: "44px 38px", width: "100%", maxWidth: 440, position: "relative", zIndex: 3, boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 50px rgba(124,92,255,0.1)" }}
      >
        <RegisterForm authApi={authApi} />
      </motion.div>
    </main>
  );
}
