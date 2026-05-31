import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/", icon: "🏠", label: "Home", end: true },
  { to: "/calendar", icon: "📅", label: "Calendar" },
  { to: "/feed", icon: "📔", label: "Diary" },
  { to: "/shop", icon: "🛍️", label: "Shop" },
  { to: "/facts", icon: "📖", label: "Facts" },
  { to: "/profile", icon: "🐢", label: "Profile" },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main navigation">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="ic" aria-hidden>{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
