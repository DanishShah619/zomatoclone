import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AppProvider } from "./context/AppContext.tsx";
import "leaflet/dist/leaflet.css";
import { SocketProvider } from "./context/SocketContext.tsx";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

export const authService = import.meta.env.VITE_AUTH_SERVICE_URL || apiBaseUrl;
export const restaurantService =
  import.meta.env.VITE_RESTAURANT_SERVICE_URL || apiBaseUrl;
export const utilsService = import.meta.env.VITE_UTILS_SERVICE_URL || apiBaseUrl;
export const realtimeService =
  import.meta.env.VITE_REALTIME_SERVICE_URL || apiBaseUrl;
export const riderService = import.meta.env.VITE_RIDER_SERVICE_URL || apiBaseUrl;
export const adminService = import.meta.env.VITE_ADMIN_SERVICE_URL || apiBaseUrl;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId="596268404302-kktqpqnl8t8r3fc33rb4clslfj8t3msc.apps.googleusercontent.com">
      <AppProvider>
        <SocketProvider>
          <App />
        </SocketProvider>
      </AppProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
