import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", icon: "🏠", label: "Home", end: true },
  { to: "/calendar", icon: "📅", label: "Calendar" },
  { to: "/shop", icon: "🛍️", label: "Shop" },
  { to: "/facts", icon: "📖", label: "Facts" },
  { to: "/profile", icon: "🐢", label: "Profile" },
];

export function TabBar() {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="ic">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
