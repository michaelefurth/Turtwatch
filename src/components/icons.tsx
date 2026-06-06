// Lightweight inline SVG icons (no dependency). Stroke-based, 24px grid,
// currentColor — used for STRUCTURAL / navigation chrome. Emoji stays for
// content & personality (mascot, moods, rewards, fact cards, stickers).
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><path d="M9.5 21v-6h5v6" /></Svg>
);
export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3.5" y="5" width="17" height="16" rx="3" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></Svg>
);
export const BookIcon = (p: IconProps) => (
  <Svg {...p}><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5z" /><path d="M5 4.5v17" /></Svg>
);
export const BagIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 8h12l-1 12.5a1 1 0 0 1-1 .9H8a1 1 0 0 1-1-.9z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></Svg>
);
export const CardsIcon = (p: IconProps) => (
  <Svg {...p}><rect x="8" y="3.5" width="12" height="14.5" rx="2.5" transform="rotate(8 14 11)" /><rect x="4" y="6" width="11" height="14" rx="2.5" /></Svg>
);
export const TurtleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 15a7.5 6.5 0 0 1 15 0" />   {/* shell dome */}
    <path d="M4.2 15h14.6" />                {/* shell base */}
    <circle cx="20.4" cy="13" r="1.6" />     {/* head */}
    <path d="M7 15v3M10.7 15.4v3M14.3 15.4v3M17.5 15v3" /> {/* legs */}
    <path d="M11.5 9.2v4.2M8.6 10.1l1 3.1M14.4 10.1l-1 3.1" /> {/* shell segments */}
  </Svg>
);
export const GearIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v2.3M12 19.2v2.3M21.5 12h-2.3M4.8 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" /></Svg>
);
export const ChevronLeftIcon = (p: IconProps) => (<Svg {...p}><path d="M15 5l-7 7 7 7" /></Svg>);
export const ChevronRightIcon = (p: IconProps) => (<Svg {...p}><path d="M9 5l7 7-7 7" /></Svg>);
export const CameraIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3.5 8.5a2 2 0 0 1 2-2h1.6l1.2-2h5.4l1.2 2h1.6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.3" /></Svg>
);
export const ImageIcon = (p: IconProps) => (
  <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="M4 17l4.5-4 3.5 3 3-2.5 5 4.5" /></Svg>
);
export const PinIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21z" /><circle cx="12" cy="10" r="2.4" /></Svg>
);
