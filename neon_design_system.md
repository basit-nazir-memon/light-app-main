# iClips Neon Design System — Full Reference

> **Purpose**: Copy this entire document and paste it to another agent so they can replicate the exact same neon card + chart + animation design system in your other project.

---

## Table of Contents

1. [Color Palette & CSS Variables](#1-color-palette--css-variables)
2. [Typography & Fonts](#2-typography--fonts)
3. [Neon Chart System (SVG Pattern Fills)](#3-neon-chart-system-svg-pattern-fills)
4. [Dark Neon Campaign Cards](#4-dark-neon-campaign-cards)
5. [Scroll-Fade Animation System](#5-scroll-fade-animation-system)
6. [Tailwind Keyframes & Animations](#6-tailwind-keyframes--animations)
7. [Full Component Code](#7-full-component-code)

---

## 1. Color Palette & CSS Variables

### Brand Accent Colors (used inline, not via CSS vars)

| Name       | Hex        | Usage                                      |
|------------|------------|---------------------------------------------|
| **LIME**   | `#A3E635`  | Primary CTA buttons, progress bars, earnings |
| **HOT_PINK** | `#F43F5E` | Secondary accent, destructive, quotes       |

### CSS Custom Properties (HSL format — used via `hsl(var(--name))`)

Add these to your global CSS inside `@layer base`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 9%;

    /* Brand accent — lime green */
    --primary: 95 100% 46%;
    --primary-foreground: 0 0% 9%;

    --secondary: 0 0% 96%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96%;
    --muted-foreground: 0 0% 45%;
    --accent: 0 0% 96%;
    --accent-foreground: 0 0% 9%;

    --destructive: 345 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --success: 95 100% 46%;
    --success-foreground: 0 0% 9%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --info: 0 0% 42%;
    --info-foreground: 0 0% 100%;

    --border: 0 0% 90%;
    --input: 0 0% 90%;
    --ring: 95 100% 46%;
    --radius: 0.375rem;

    /* Severity scale */
    --severity-critical: 345 72% 51%;
    --severity-high: 25 95% 53%;
    --severity-medium: 38 92% 50%;
    --severity-low: 95 100% 46%;
  }

  /* Dark mode — neutral charcoal #222222, NO blue/purple tint */
  .dark {
    --background: 0 0% 13%;
    --foreground: 0 0% 93%;
    --card: 0 0% 16%;
    --card-foreground: 0 0% 93%;
    --popover: 0 0% 16%;
    --popover-foreground: 0 0% 93%;

    --primary: 95 100% 46%;
    --primary-foreground: 0 0% 9%;
    --secondary: 0 0% 18%;
    --secondary-foreground: 0 0% 92%;
    --muted: 0 0% 18%;
    --muted-foreground: 0 0% 52%;
    --accent: 0 0% 19%;
    --accent-foreground: 0 0% 92%;

    --destructive: 345 90% 60%;
    --destructive-foreground: 0 0% 100%;
    --success: 95 100% 46%;
    --success-foreground: 0 0% 9%;
    --warning: 38 100% 55%;
    --warning-foreground: 0 0% 100%;
    --info: 0 0% 50%;
    --info-foreground: 0 0% 100%;

    --border: 0 0% 22%;
    --input: 0 0% 22%;
    --ring: 95 100% 46%;

    --severity-critical: 345 90% 60%;
    --severity-high: 25 100% 58%;
    --severity-medium: 38 100% 55%;
    --severity-low: 95 100% 46%;
  }
}
```

### Color Maps (TypeScript)

```typescript
// Status colors for charts
const STATUS_COLORS: Record<string, string> = {
  new: "hsl(var(--info))",
  assigned: "hsl(var(--primary))",
  in_progress: "hsl(var(--warning))",
  testing: "hsl(0, 0%, 52%)",
  resolved: "hsl(var(--success))",
  closed: "hsl(var(--muted-foreground))",
};

// Severity colors for charts
const SEVERITY_COLORS: Record<string, string> = {
  critical: "hsl(var(--severity-critical))",
  high: "hsl(var(--severity-high))",
  medium: "hsl(var(--severity-medium))",
  low: "hsl(var(--severity-low))",
};

// Inline brand colors (not CSS vars — used directly in JSX)
const LIME = "#A3E635";
const HOT_PINK = "#F43F5E";
```

---

## 2. Typography & Fonts

### Google Fonts Imports

```css
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
```

### Tailwind Font Family Config

```typescript
// tailwind.config.ts → theme.extend.fontFamily
fontFamily: {
  sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
  marker: ["Permanent Marker", "cursive", "sans-serif"],
  bebas: ["Bebas Neue", "cursive", "sans-serif"],
},
```

### Body Defaults

```css
body {
  font-family: 'Geist', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## 3. Neon Chart System (SVG Pattern Fills)

> [!IMPORTANT]
> This is the core visual effect. It creates **diagonal-line hatching patterns** inside chart bars/areas/pies that give a "neon blueprint" aesthetic. The fill is a semi-transparent diagonal line pattern with the bar's stroke color as a bright neon outline.

### Architecture

```
NeonPatternDefs.tsx  →  Renders hidden <svg> with <pattern> defs (global)
use-neon-charts.ts   →  Hook that returns getFill(color) for Recharts shapes
NeonToggle.tsx       →  Optional toggle button to enable/disable neon mode
```

### File: `NeonPatternDefs.tsx`

```tsx
export function neonPatternId(color: string) {
  return `neon-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
}

/**
 * Renders a hidden SVG element containing diagonal-line pattern definitions.
 * Place this anywhere in the component tree — pattern IDs are globally
 * accessible across all SVGs in the same document.
 */
export function NeonPatternDefs({ colors }: { colors: string[] }) {
  const unique = [...new Set(colors)];
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        {unique.map((color) => (
          <pattern
            key={color}
            id={neonPatternId(color)}
            patternUnits="userSpaceOnUse"
            width="6"
            height="6"
            patternTransform="rotate(-45)"
          >
            <rect width="6" height="6" fill={color} opacity="0.10" />
            <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="1.2" opacity="0.6" />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}
```

> [!TIP]
> **How it works**: Each pattern creates a 6×6px tile rotated -45°. The tile has:
> - A faint background rect at 10% opacity of the color
> - A single vertical line at 60% opacity → when rotated, this becomes diagonal hatching
> - The result: semi-transparent diagonal lines in the chart's color

### File: `use-neon-charts.ts`

```typescript
import { useCallback } from "react";
import { neonPatternId } from "@/components/NeonPatternDefs";

export function useNeonCharts() {
  /** Returns fill props for a Recharts shape (Bar Cell, Area, etc.) */
  const getFill = useCallback(
    (color: string) => ({
      fill: `url(#${neonPatternId(color)})`,
      stroke: color,
      strokeWidth: 1.5,
    }),
    []
  );

  return { getFill };
}
```

### File: `NeonToggle.tsx`

```tsx
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NeonToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      onClick={onToggle}
      className="h-7 gap-1.5 text-[12px]"
      title="Toggle neon chart style"
    >
      <Sparkles className="h-3 w-3" />
      Neon
    </Button>
  );
}
```

### Usage in a Page (Recharts)

```tsx
import { NeonPatternDefs } from "@/components/NeonPatternDefs";
import { useNeonCharts } from "@/hooks/use-neon-charts";
import { BarChart, Bar, Cell, PieChart, Pie, AreaChart, Area } from "recharts";

export default function MyDashboard() {
  const { getFill } = useNeonCharts();

  return (
    <div>
      {/* 1. Mount the pattern defs ONCE — pass ALL colors you'll use */}
      <NeonPatternDefs colors={[
        ...Object.values(STATUS_COLORS),
        ...Object.values(SEVERITY_COLORS),
        "hsl(var(--warning))",
        "hsl(var(--success))",
        "hsl(var(--primary))",
      ]} />

      {/* 2. BAR CHART — spread getFill onto each Cell */}
      <BarChart data={statusData}>
        <Bar dataKey="count" radius={0}>
          {statusData.map((entry, i) => (
            <Cell key={i} {...getFill(entry.fill)} />
          ))}
        </Bar>
      </BarChart>

      {/* 3. PIE CHART — same pattern */}
      <PieChart>
        <Pie data={severityData} dataKey="value" innerRadius={50} outerRadius={80}>
          {severityData.map((entry, i) => (
            <Cell key={i} {...getFill(entry.fill)} />
          ))}
        </Pie>
      </PieChart>

      {/* 4. AREA CHART — use neonPatternId directly for fill */}
      <AreaChart data={areaData}>
        <Area
          type="monotone"
          dataKey="open"
          stackId="1"
          stroke="hsl(var(--warning))"
          fill={`url(#${neonPatternId("hsl(var(--warning))")})`}
          fillOpacity={1}
          strokeWidth={1.5}
        />
      </AreaChart>
    </div>
  );
}
```

### Advanced: Custom Bar Shape with Neon Borders

For stacked bars where you want individual neon borders on each segment:

```tsx
<Bar
  dataKey="critical"
  stackId="a"
  fill={`url(#${neonPatternId(SEVERITY_COLORS.critical)})`}
  stroke={SEVERITY_COLORS.critical}
  strokeWidth={1.5}
  shape={(props: any) => {
    const { x, y, width, height, fill, stroke } = props;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill={fill} stroke="none" />
        <line x1={x} y1={y+height} x2={x+width} y2={y+height} stroke={stroke} strokeWidth={1.5} />
        <line x1={x} y1={y} x2={x} y2={y+height} stroke={stroke} strokeWidth={1.5} />
        <line x1={x+width} y1={y} x2={x+width} y2={y+height} stroke={stroke} strokeWidth={1.5} />
        <line x1={x} y1={y} x2={x+width} y2={y} stroke={stroke} strokeWidth={0.5} />
      </g>
    );
  }}
/>
```

---

## 4. Dark Neon Campaign Cards

### Card Data Structure

```typescript
const TRENDING_MOCK: {
  id: string;
  title: string;
  budget: number;
  usedPct: number;
  bg: string;  // CSS linear-gradient for header
}[] = [
  { id: "t1", title: "Pathos [CLIPPING]",    budget: 3000, usedPct: 17, bg: "linear-gradient(135deg,#1a0808,#3a1010)" },
  { id: "t2", title: "Sienna Spiro",         budget: 2500, usedPct: 20, bg: "linear-gradient(135deg,#1a0a1e,#4a1040)" },
  { id: "t3", title: "Duel.com [CLIPPING]",  budget: 4000, usedPct: 42, bg: "linear-gradient(135deg,#0a1020,#1a3060)" },
  { id: "t4", title: "White Noise [EDITS]",  budget: 5620, usedPct: 60, bg: "linear-gradient(135deg,#101020,#202040)" },
  { id: "t5", title: "OneState [GERMANY]",   budget: 2625, usedPct: 0,  bg: "linear-gradient(135deg,#0a1808,#1a3810)" },
];
```

### Card Component (JSX)

```tsx
const LIME = "#A3E635";
const HOT_PINK = "#F43F5E";

{TRENDING_MOCK.map((c) => {
  // Color-coded progress: green → amber → pink
  const progressColor = c.usedPct > 70 ? HOT_PINK : c.usedPct > 40 ? "#ffaa32" : LIME;
  const tag = c.title.split("[")[1]?.replace("]", "") || c.title.split(" ")[0];

  return (
    <article
      key={c.id}
      className="group relative flex w-[160px] shrink-0 snap-start flex-col overflow-hidden
                 rounded-[20px] border border-white/5 bg-[#191919]
                 transition-all hover:-translate-y-1.5 hover:border-lime-500/20
                 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
    >
      {/* Gradient Header */}
      <div
        className="relative flex h-[100px] items-center justify-center overflow-hidden
                   font-bebas text-[20px] tracking-wider text-white/90"
        style={{ background: c.bg }}
      >
        <span className="relative z-[1] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] uppercase">
          {tag}
        </span>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent
                        opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-3 pt-2.5">
        <p className="line-clamp-1 mb-1.5 text-[11px] font-bold text-white">{c.title}</p>
        <p className="mb-1 text-[11px] font-medium text-white/50">${c.budget.toLocaleString()}</p>

        {/* Neon Progress Bar */}
        <div className="mt-1 h-[2.5px] w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${c.usedPct}%`, backgroundColor: progressColor }}
          />
        </div>

        <p className="mt-2 text-[10px] font-semibold tracking-wide text-white/40 uppercase">
          {c.usedPct}% used
        </p>
      </div>
    </article>
  );
})}
```

### Key Design Tokens for the Card

| Property | Value | Purpose |
|----------|-------|---------|
| `bg-[#191919]` | Card body background | Near-black, not pure black |
| `border-white/5` | Default border | Almost invisible |
| `hover:border-lime-500/20` | Hover border | Subtle neon glow |
| `hover:-translate-y-1.5` | Hover lift | Premium float effect |
| `hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)]` | Hover shadow | Deep shadow on lift |
| `rounded-[20px]` | Border radius | Generous, modern rounding |
| `font-bebas` | Header font | Bebas Neue — condensed display |
| `drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]` | Text shadow | Depth on gradient bg |

### Horizontal Scroll Container with Edge Fades

```tsx
<div className="relative">
  {/* Left fade */}
  <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-20
                  bg-gradient-to-r from-black to-transparent" />
  {/* Right fade */}
  <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-20
                  bg-gradient-to-l from-black to-transparent" />

  {/* Scrollable row — hidden scrollbar */}
  <div className="flex gap-4 overflow-x-auto py-6 px-10
                  [-ms-overflow-style:none] [scrollbar-width:none]
                  snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
    {/* Cards go here */}
  </div>
</div>
```

> [!TIP]
> For light mode, swap `from-black` → `from-white` on the edge fades using a conditional:
> ```tsx
> className={cn("... bg-gradient-to-r to-transparent", isDark ? "from-black" : "from-white")}
> ```

---

## 5. Scroll-Fade Animation System

### How It Works

A single `useEffect` scroll listener calculates opacity for each tracked section based on its position relative to the viewport. Sections fade in when entering from the bottom AND when entering from the top (scrolling back up).

### Implementation

```tsx
import { useEffect, useRef } from "react";

// 1. Create refs for each section
const heroFadeRef = useRef<HTMLDivElement>(null);
const section2FadeRef = useRef<HTMLDivElement>(null);
const section3FadeRef = useRef<HTMLDivElement>(null);

// 2. Single scroll handler
useEffect(() => {
  const onScroll = () => {
    const winH = window.innerHeight;

    // Config
    const entryPoint = winH * 0.85;  // Fade-in starts when top is at 85% of viewport
    const exitPoint = 150;            // Fade-out starts when bottom reaches 150px from top
    const fadeDist = 450;             // Distance (px) over which the fade animation plays

    const updateOpacity = (el: HTMLElement | null) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      let opacity = 1;

      if (rect.top > entryPoint) {
        // Entering from bottom (scrolling down) or leaving to bottom (scrolling up)
        opacity = Math.max(0, 1 - (rect.top - entryPoint) / fadeDist);
      } else if (rect.bottom < exitPoint) {
        // Leaving to top (scrolling down) or entering from top (scrolling up)
        opacity = Math.max(0, rect.bottom / exitPoint);
      }
      el.style.opacity = String(opacity);
    };

    // Apply to all tracked sections
    updateOpacity(heroFadeRef.current);
    updateOpacity(section2FadeRef.current);
    updateOpacity(section3FadeRef.current);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll(); // Run once on mount
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}, []);

// 3. Attach refs to section wrappers
<div
  ref={heroFadeRef}
  className="will-change-[opacity] transition-opacity duration-1000 ease-out"
  style={{ opacity: 1 }}
>
  {/* Section content */}
</div>
```

> [!IMPORTANT]
> The CSS class `will-change-[opacity] transition-opacity duration-1000` is required on each fade target. The JS sets opacity directly, and the CSS transition smooths it out.

---

## 6. Tailwind Keyframes & Animations

Add to `tailwind.config.ts` → `theme.extend`:

```typescript
keyframes: {
  "fade-in": {
    "0%": { opacity: "0", transform: "translateY(6px)" },
    "100%": { opacity: "1", transform: "translateY(0)" },
  },
  "scale-in": {
    "0%": { transform: "scale(0.96)", opacity: "0" },
    "100%": { transform: "scale(1)", opacity: "1" },
  },
  "float": {
    "0%,100%": { transform: "translateY(0)" },
    "50%": { transform: "translateY(-6px)" },
  },
  "shimmer": {
    "0%": { backgroundPosition: "-400px 0" },
    "100%": { backgroundPosition: "400px 0" },
  },
  "pulse-ring": {
    "0%": { transform: "scale(0.9)", opacity: "0.7" },
    "100%": { transform: "scale(1.6)", opacity: "0" },
  },
},
animation: {
  "fade-in": "fade-in 0.4s ease-out",
  "scale-in": "scale-in 0.25s ease-out",
  "float": "float 3s ease-in-out infinite",
  "shimmer": "shimmer 2s linear infinite",
  "pulse-ring": "pulse-ring 1.6s cubic-bezier(0.215,0.61,0.355,1) infinite",
},
```

### Usage

```html
<!-- Fade in on mount -->
<div className="animate-fade-in">...</div>

<!-- Floating hero image -->
<img className="motion-safe:animate-float" />

<!-- Loading shimmer -->
<div className="animate-shimmer" />

<!-- Pulsing notification ring -->
<span className="animate-pulse-ring" />
```

---

## 7. Full Component Code

### Dependencies Required

```json
{
  "recharts": "^2.x",
  "lucide-react": "^0.x",
  "tailwindcss": "^3.x",
  "tailwindcss-animate": "^1.x",
  "clsx": "^2.x",
  "tailwind-merge": "^2.x"
}
```

### `cn()` Utility (required by all components)

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Tailwind Plugin

```typescript
// tailwind.config.ts
plugins: [require("tailwindcss-animate")],
```

---

> [!NOTE]
> **To integrate into another project:**
> 1. Copy the CSS variables into your global stylesheet
> 2. Add the font imports
> 3. Copy `NeonPatternDefs.tsx`, `use-neon-charts.ts`, and optionally `NeonToggle.tsx`
> 4. Add the keyframes/animations to your Tailwind config
> 5. Mount `<NeonPatternDefs>` once per page with all colors you'll use
> 6. Use `getFill(color)` from the hook on Recharts `<Cell>` components
> 7. For scroll-fade sections, use the `updateOpacity` pattern with refs
