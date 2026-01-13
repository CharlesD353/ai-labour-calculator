# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive calculator exploring how compute constraints might affect AI/human labour substitution over time. Models whether AI will make human labour economically worthless based on adjustable assumptions about compute growth, substitutability, and demand.

## Common Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production (runs tsc then vite build)
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Architecture

```
src/
├── App.tsx              # Main app with all state and UI (~117KB, large file)
├── components/          # UI components for tabs and controls
├── models/              # Economic model logic
│   └── allocation.ts    # Market-clearing allocation algorithms
├── data/                # Static data files
├── index.css            # Tailwind styles
└── main.tsx             # Entry point
```

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Recharts for data visualization

## Key Concepts

The model uses:
- **5-tier task model**: Routine → Skilled → Professional → Expert → Frontier
- **Time-varying substitutability (σ)**: S-curve from initial value toward asymptote
- **Market-clearing allocation**: Uniform-price auction allocates scarce compute
- **Skill-stratified labour**: Workers have skill ceilings limiting which tiers they can work

## Deployment

Deploys to GitHub Pages via `.github/workflows/deploy.yml` on push to `main`.
