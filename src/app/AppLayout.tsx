import { Outlet } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#EEF0F5" }}>
      <div className="flex h-full shrink-0" style={{ zIndex: 10 }}>
        <Sidebar />
      </div>
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
