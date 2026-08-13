import { useState } from "react";
import { useAppData } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authService } from "../main";
import { WarpBackground } from "../components/ui/warp-background";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "../components/ui/card";

type Role = "customer" | "rider" | "seller" | null;
const SelectRole = () => {
  const [role, setRole] = useState<Role>(null);
  const { setUser } = useAppData();
  const navigate = useNavigate();

  const roles: Role[] = ["customer", "rider", "seller"];

  const addRole = async () => {
    try {
      const { data } = await axios.put(
        `${authService}/api/auth/add/role`,
        { role },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      localStorage.setItem("token", data.token);
      setUser(data.user);

      navigate("/restaurants", { replace: true });
    } catch (error) {
      alert("something went wrong");
      console.log(error);
    }
  };
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
                Choose your role
              </CardTitle>
              <CardDescription className="text-sm text-gray-500">
                Select how you want to use Tomato.
              </CardDescription>
            </div>

            <div className="space-y-4">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`
                    w-full rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                      role === r
                        ? "border-[#E23744] bg-[#E23744] text-white shadow-sm"
                        : "border-gray-300 bg-white text-gray-700 hover:border-[#E23744]/40 hover:bg-[#fff7f8]"
                    }
                    `}
                >
                  Continue as {r}
                </button>
              ))}
            </div>
            <button
              disabled={!role}
              onClick={addRole}
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${
                role
                  ? "border-[#E23744] bg-[#E23744] text-white hover:bg-[#d32f3a]"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              Next
            </button>
          </CardContent>
        </Card>
      </WarpBackground>
    </div>
  );
};

export default SelectRole;
