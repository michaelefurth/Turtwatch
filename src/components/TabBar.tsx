import { NavLink } from "react-router-dom";
import type { ComponentType, SVGProps } from "react";
import { HomeIcon, CalendarIcon, BookIcon, BagIcon, CardsIcon, TurtleIcon } from "@/components/icons";

type Tab = { to: string; Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>; label: string; end?: boolean };

const TABS: Tab[] = [
  { to: "/", Icon: HomeIcon, label: "Home", end: true },
  { to: "/calendar", Icon: CalendarIcon, label: "Calendar" },
  { to: "/feed", Icon: BookIcon, label: "Diary" },
  { to: "/shop", Icon: BagIcon, label: "Shop" },
  { to: "/facts", Icon: CardsIcon, label: "Cards" },
  { to: "/profile", Icon: TurtleIcon, label: "Profile" },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Main navigation">
      {TABS.map(({ to, Icon, label, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>
          <span className="ic"><Icon size={22} /></span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
