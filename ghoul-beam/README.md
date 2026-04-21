# Ghoul Beam 🩸

A Tokyo Ghoul themed network stress testing tool, forked from [MikuMikuBeam](https://github.com/sammwyy/MikuMikuBeam) by [@Sammwy](https://github.com/sammwyy).

## Theme Changes

- **Dark color palette**: Black/crimson replacing pastel pink/blue
- **Ghoul Eye (Kakugan)**: Animated CSS ghoul eye replaces the Miku character
- **Tokyo Ghoul flavor text**: "In the world of ghouls, even networks fear Kaneki's wrath."
- **Red glow effects**: Pulsing crimson glow during attacks
- **Dark UI**: All inputs, cards, and widgets use a dark/blood-red palette

## Quick Start

```bash
# 1. Clone and setup
cd ghoul-beam

# 2. Install dependencies
make prepare

# 3. Create required files
echo "http://proxy1:8080" > data/proxies.txt
echo "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" > data/uas.txt

# 4. Build and run
make all && make run-server

# 5. Open http://localhost:3000 in your browser
```

## Attack Methods

- `HTTP Flood` — Send random HTTP requests
- `HTTP Bypass` — Send HTTP requests that mimic real browsers
- `HTTP Slowloris` — Send slow HTTP requests and keep connection open
- `Minecraft Ping` — Send Minecraft ping/motd requests
- `TCP Flood` — Send random TCP packets

## Prerequisites

- Go v1.21+
- Node.js v18+
- npm

## Original Project

Based on [MikuMikuBeam](https://github.com/sammwyy/MikuMikuBeam) — all credit for the core functionality goes to [@Sammwy](https://github.com/sammwyy).
