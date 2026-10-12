# Render packs with one client-side JS engine; any AI writes the pack

- **Status:** accepted
- **Date:** 2026-10-12
- **Deciders:** StoryQuest maintainers
- **Decided in:** project kickoff (2026-10-12)
- **Implemented:** yes (v1.0.0)

## Context and problem

The summer-2026 packets were hand-built Python + HTML per book. The goal is one tool for repeat runs and for parents and teachers who don't code, using Claude or whatever AI subscription they already have.

## Decision

We will keep the content in a JSON **pack** that any chat AI writes from a self-contained copy-paste prompt (`engine/prompt.js`). We will render packs with **one dependency-free JS engine** (`engine/storyquest.js`) that runs in the browser (`index.html`, served from GitHub Pages, nothing uploaded) and, for coding agents, inside headless Chrome from a stdlib-only Python CLI.

## Options considered

- **Browser engine + CLI wrapper (chosen)**: no install for the main audience, one layout implementation, so the web page and the CLI can't drift apart.
- **Python generator only** (the summer approach): needs Python and Chrome, so it's unusable for a non-technical parent.
- **Hosted service calling an AI API**: costs money per packet, needs accounts and keys, and sends children's details to a server. Rejected on cost and privacy.

## Consequences

- AI output is untrusted text: everything is escaped (`esc`/`md`), and there's a test for it.
- An AI that overfills a page is handled by `fitPages()` trimming writing lines. Page geometry lives in one place (`geometry()`).
- Accuracy depends on what the user's AI can look up. The guide's red sources box and the "book is the tiebreaker" line are mandatory.

## Confirmation

`node --test tests/*.test.mjs` (escaping, crossword, validation, prompt covers every activity type and icon) and `pytest` (CLI page count and fit against `examples/`).

## Revisit when

Browsers drop a print feature we rely on (`@page` size and margins), or the audience asks for a native app.
