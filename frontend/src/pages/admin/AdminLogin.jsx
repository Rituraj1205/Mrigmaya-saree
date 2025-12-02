import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axios from "../../api/axios";
import { AuthContext } from "../../context/AuthContext";

export default function AdminLogin() {
  const { login } = useContext(AuthContext);
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const sendOtp = async () => {
    try {
      await axios.post("/auth/send-otp", { mobile });
      toast.success("OTP sent");
      setStep(2);
    } catch (err) {
      toast.error("Failed to send OTP");
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await axios.post("/auth/verify-otp", { mobile, otp });
      if (res.data.user?.role !== "admin") {
        toast.error("Admin access only");
        return;
      }
      login(res.data.token, res.data.user);
      toast.success("Welcome back");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.msg || "Invalid OTP");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="card-shell w-full max-w-md p-8 space-y-5">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">Admin panel</p>
          <h1 className="text-2xl font-semibold text-[var(--ink)] mt-1">Login via OTP</h1>
          <p className="text-sm text-[var(--muted)]">Use the admin registered mobile number.</p>
        </div>

        {step === 1 ? (
          <>
            <label className="text-sm text-[var(--muted)]">Mobile number</label>
            <input
              type="text"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+91xxxxxxxxxx"
              className="border border-[var(--border)] rounded-xl w-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 bg-white"
            />
            <button
              onClick={sendOtp}
              className="w-full pill-button justify-center"
            >
              Send OTP
            </button>
          </>
        ) : (
          <>
            <label className="text-sm text-[var(--muted)]">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="border border-[var(--border)] rounded-xl w-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 bg-white"
            />
            <button
              onClick={verifyOtp}
              className="w-full pill-button justify-center"
            >
              Verify &amp; Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
