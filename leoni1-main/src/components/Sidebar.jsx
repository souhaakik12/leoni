import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const allNavItems = [
  {
    path: "/",
    label: "Dashboard",
    roles: ["admin"],
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    path: "/missions",
    label: "Missions",
    roles: ["admin", "recruteur"],
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
  },
  {
    path: "/candidats",
    label: "Candidats",
    roles: ["admin", "recruteur"],
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    path: "/dorms",
    label: "Foyers",
    roles: ["admin", "recruteur"],
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    path: "/contracts",
    label: "Contrats",
    roles: ["admin", "contrats"],
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  },
  {
    path: "/profile",
    label: "Mon Profil",
    roles: ["recruteur", "contrats"],
    icon: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
];

export default function Sidebar({ isOpen }) {
  const { user, logout } = useAuth();
  const navItems = allNavItems.filter(n => n.roles.includes(user?.role));

  return (
    <aside style={{
      width: isOpen ? 230 : 60,
      background: "#fff",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      transition: "width 0.3s cubic-bezier(.4,0,.2,1)",
      overflow: "hidden", flexShrink: 0,
      minHeight: "100vh",
      boxShadow: "2px 0 8px rgba(0,0,0,0.04)",
    }}>

      {/* Logo */}
      <div style={{ padding: isOpen ? "20px 20px 16px" : "20px 12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: "#F5C200", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#000" }}>L</span>
        </div>
        {isOpen && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1d23", letterSpacing: "0.04em" }}>LEONI</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Tunisia · RH System</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {isOpen && (
          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "4px 8px 8px" }}>
            Navigation
          </div>
        )}
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/" || item.path === "/profile"}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, textDecoration: "none",
              background: isActive ? "var(--accent-light)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: isActive ? 600 : 400, fontSize: 13.5,
              justifyContent: isOpen ? "flex-start" : "center",
              transition: "all 0.15s ease",
            })}
          >
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            {isOpen && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div style={{ borderTop: "1px solid var(--border)", padding: isOpen ? "14px 16px" : "14px 10px" }}>
        {isOpen ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                {user?.avatar}
              </div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.nom}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
              </div>
            </div>
            <button onClick={logout} style={{
              width: "100%", padding: "7px", border: "1px solid var(--border)",
              borderRadius: 7, background: "#f9fafb", color: "var(--text-secondary)",
              fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Déconnexion
            </button>
          </>
        ) : (
          <button onClick={logout} title="Déconnexion" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", justifyContent: "center", width: "100%" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        )}
      </div>
    </aside>
  );
}