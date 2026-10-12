# Offer curated book skins: the AI suggests two or three, the parent picks

- **Status:** accepted
- **Date:** 2026-10-12
- **Deciders:** StoryQuest maintainers
- **Decided in:** storyquest go-public review (2026-10-12)
- **Implemented:** yes (v1.0.0)

## Context and problem

A packet had three looks: Pixel quest, Storybook and Clean. They suit a Minecraft book and a plain one, but a Treasure Island packet looked like a video game, and nothing in the prompt helped a parent choose. The AI already tailors level names and icons to the book; the look was the one part left generic.

## Decision

We will ship a **curated catalog of skins** (the `THEMES` table in `engine/storyquest.js`) and let the AI suggest the two or three that fit the book, each with a one-line reason, in an optional `theme_suggestions` field. The parent picks one (or says "you choose"), and the web page shows the suggestions as buttons next to the look picker. The three original ids keep working unchanged.

## Options considered

- **Curated skins, AI suggests, parent picks (chosen)**: every skin is designed and tested once (palette, contrast, one sheet per quest, ink use), so any pick prints well. The AI only has to match book to catalog.
- **AI-invented free palettes and fonts**: maximum fit, but an AI can't see the page. Low-contrast text, muddy colours and heavy ink are likely, and there'd be no way to test them. Rejected on contrast and ugliness risk.
- **Recommend-only among the three existing looks**: no new design work, but a pirate or space book still ends up on parchment or pixels. Too little fit to be worth the question.

## Consequences

- The catalog is the single source: the prompt's list of looks is generated from it, so the two can't drift.
- Adding a skin is a code change (a `THEMES` entry, a CSS block, maybe a header motif and a font), not something a pack can do alone.
- Decorative fonts ship in `engine/fonts/` (self-hosted, latin subset, about 130 KB across six files) so the tool still works offline and under the page's CSP. Each family's license sits beside it. Special Elite is Apache 2.0; the rest are SIL OFL.
- Skins stay on near-white paper with thin lines, so they print cheaper than Pixel quest. Clean remains the cheapest.
- `theme_suggestions[].why` is AI text and is escaped like every other pack string.

## Confirmation

`node --test tests/*.test.mjs` (every skin renders; the prompt lists every skin; `why` is escaped; unknown ids fall back with a warning; the three originals render unchanged) and `pytest` (the Treasure Island example fits one sheet per quest in every look).

## Revisit when

Parents keep asking for a look the catalog lacks (add one), or a skin proves hard to read or costly to print (fix or drop it).
