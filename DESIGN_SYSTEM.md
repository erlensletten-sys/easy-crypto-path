# Design System Documentation

## Typography

### Font Family
- **Primary Font**: Inter (sans-serif)
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semi-bold), 700 (Bold)
- **Import**: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`

---

## Core Color Palette

### Base Colors
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| `--background` | `230 25% 8%` | `#0f1117` | Page background |
| `--foreground` | `220 20% 95%` | `#f0f2f5` | Primary text |
| `--card` | `230 20% 12%` | `#181c26` | Card backgrounds |
| `--card-foreground` | `220 20% 95%` | `#f0f2f5` | Card text |
| `--popover` | `230 25% 10%` | `#131720` | Popover backgrounds |
| `--popover-foreground` | `220 20% 95%` | `#f0f2f5` | Popover text |

### Brand Colors
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| `--primary` | `265 80% 60%` | `#9333ea` | Primary actions, buttons |
| `--primary-foreground` | `0 0% 100%` | `#ffffff` | Text on primary |
| `--accent` | `265 70% 55%` | `#8b5cf6` | Accent elements |
| `--accent-foreground` | `0 0% 100%` | `#ffffff` | Text on accent |

### Secondary & Muted
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| `--secondary` | `230 15% 18%` | `#272c38` | Secondary backgrounds |
| `--secondary-foreground` | `220 20% 85%` | `#d1d5db` | Secondary text |
| `--muted` | `230 15% 20%` | `#2d323f` | Muted backgrounds |
| `--muted-foreground` | `220 10% 55%` | `#858a94` | Muted text |

### Utility Colors
| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| `--border` | `230 15% 22%` | `#333847` | Borders |
| `--input` | `230 15% 18%` | `#272c38` | Input backgrounds |
| `--ring` | `265 80% 60%` | `#9333ea` | Focus rings |
| `--destructive` | `0 84% 60%` | `#ef4444` | Error states |
| `--destructive-foreground` | `0 0% 100%` | `#ffffff` | Text on destructive |

---

## Crypto Asset Colors

| Token | HSL | Hex | Asset |
|-------|-----|-----|-------|
| `--crypto-green` | `145 70% 50%` | `#22c55e` | General success |
| `--crypto-orange` | `35 90% 55%` | `#f59e0b` | Bitcoin (BTC) |
| `--crypto-blue` | `210 90% 60%` | `#3b82f6` | Ethereum (ETH) |
| `--crypto-teal` | `175 70% 45%` | `#14b8a6` | Tether (USDT) |
| `--crypto-pink` | `330 80% 60%` | `#ec4899` | Accent |
| `--crypto-purple` | `280 70% 55%` | `#a855f7` | Solana (SOL) |
| `--crypto-gray` | `220 10% 50%` | `#737a8c` | Monero (XMR) |

---

## Design Tokens

### Border Radius
```css
--radius: 0.75rem  /* 12px */
```

### Gradients
```css
/* Card gradient */
--gradient-card: linear-gradient(180deg, hsl(230 20% 14%) 0%, hsl(230 20% 10%) 100%);

/* Hover gradient */
--gradient-hover: linear-gradient(180deg, hsl(230 20% 18%) 0%, hsl(230 20% 14%) 100%);
```

### Shadows
```css
/* Primary glow effect */
--shadow-glow: 0 0 20px hsl(265 80% 60% / 0.15);
```

---

## Tailwind Utility Classes

### Custom Utilities
```css
.gradient-card    /* Applies card gradient background */
.gradient-hover   /* Applies hover gradient background */
.glow-primary     /* Applies purple glow shadow */
```

---

## Dark Theme Note

This design system is built as a **dark-first** theme. The `:root` and `.dark` selectors share the same values, providing a consistent dark experience throughout the application.
