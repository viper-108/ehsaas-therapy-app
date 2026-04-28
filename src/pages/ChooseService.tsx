import { useEffect } from "react";
import { Navigate } from "react-router-dom";

// Legacy alias — the canonical client service picker is /services.
// Anyone landing here (e.g., from old emails or bookmarks) is forwarded.
export default function ChooseService() {
  useEffect(() => {
    // Use replace to avoid leaving a back-navigation loop
  }, []);
  return <Navigate to="/services" replace />;
}
