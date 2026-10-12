# Printing

## From the web page

Press **Print the kid's packet** or **Print the answer guide**. In the print window:

- **Destination**: your printer, or **Save as PDF** to keep a copy.
- **Margins**: Default. **Scale**: 100%. (StoryQuest sets the margins itself.)
- **Background graphics** (Chrome, Edge) or **Print backgrounds** (Safari): on, so the colors print. Clean uses the least ink. The book looks use a pale page tint, and Pixel quest uses the most.
- **Two-sided**: fine for the answer guide. Keep the kid's packet single-sided if they'll draw on the backs.

Each quest prints on exactly one sheet. If the AI wrote too much for a page, StoryQuest removes a few writing lines so it fits and says so above the preview. If a page still doesn't fit, it tells you which one to ask the AI to shorten.

## Binder margin

The extra left margin is 1.25in. That clears three-hole punches and the prongs of a pocket folder. If you're stapling, turn it off under settings.

## Paper

US Letter or A4. Change it in the settings before you print, and the layout adjusts.

## From the command line

```bash
python3 cli/storyquest.py build my-pack.storyquest.json
```

This writes `my-pack-packet.pdf` and `my-pack-guide.pdf` next to the pack and checks the page count. It needs Chrome, Chromium or Edge. Set `STORYQUEST_CHROME` if yours is somewhere unusual.
