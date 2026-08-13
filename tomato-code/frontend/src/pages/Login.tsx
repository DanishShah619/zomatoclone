import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../main";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { useAppData } from "../context/AppContext";
import { WarpBackground } from "../components/ui/warp-background";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "../components/ui/card";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { setUser, setIsAuth } = useAppData();

  const responseGoogle = async (authResult: any) => {
    setLoading(true);
    try {
      const result = await axios.post(`${authService}/api/auth/login`, {
        code: authResult["code"],
      });

      localStorage.setItem("token", result.data.token);
      toast.success(result.data.message);
      setLoading(false);
      setUser(result.data.user);
      setIsAuth(true);
      navigate("/restaurants");
    } catch (error) {
      console.log(error);
      toast.error("Problem while login");
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: responseGoogle,
    onError: responseGoogle,
    flow: "auth-code",
  });
  return (
    <div className="min-h-screen bg-white">
      <WarpBackground
        perspective={130}
        beamsPerSide={5}
        beamSize={6}
        beamDuration={4}
        gridColor="rgba(148,163,184,0.24)"
        className="flex min-h-screen w-full items-center justify-center bg-white px-4 py-10"
      >
        <Card className="mx-auto w-full max-w-sm border-gray-200 bg-white shadow-lg">
          <CardContent className="flex flex-col gap-6 p-6 sm:p-7">
            <div className="space-y-2 text-center">
              <CardTitle className="text-3xl font-extrabold text-[#E23744]">
                Tomato
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Log in or sign up to discover restaurants near you.
              </CardDescription>
            </div>
            <button
              onClick={googleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-[#E23744]/40 hover:bg-[#fff7f8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FcGoogle size={21} />
              {loading ? "Signing in ..." : "Continue with Google"}
            </button>

            <p className="text-center text-xs leading-5 text-gray-400">
              By continuing, you agree with our{" "}
              <span className="font-medium text-[#E23744]">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="font-medium text-[#E23744]">Privacy Policy</span>
              .
            </p>
          </CardContent>
        </Card>
      </WarpBackground>
    </div>
  );
};

export default Login;
