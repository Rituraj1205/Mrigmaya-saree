import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

export default function AdminLogin() {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState("mrigmaya101@gmail.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Email and password required");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post("/auth/login-password", { email, password });
      if (res.data.user?.role !== "admin") {
        toast.error("Admin access only");
        setLoading(false);
        return;
      }
      login(res.data.token, res.data.user);
      toast.success("Welcome back");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="card-shell w-full max-w-md p-8 space-y-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">Admin panel</p>
          <h1 className="text-2xl font-semibold text-[var(--ink)] mt-1">Login with password</h1>
          <p className="text-sm text-[var(--muted)]">Use the admin email and password.</p>
        </div>

        <label className="text-sm text-[var(--muted)]">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          className="border border-[var(--border)] rounded-xl w-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 bg-white"
        />

        <label className="text-sm text-[var(--muted)]">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-[var(--border)] rounded-xl w-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 bg-white"
        />

        <button
          onClick={handleLogin}
          className="w-full pill-button justify-center disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </div>
    </div>
  );
}
