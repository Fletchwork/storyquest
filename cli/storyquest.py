#!/usr/bin/env python3
"""StoryQuest command line: build print-ready PDFs from a pack, and check they print right.

    python3 cli/storyquest.py build my-pack.json            # -> my-pack-packet.pdf, my-pack-guide.pdf
    python3 cli/storyquest.py check my-pack.json            # validate + page-fit report, no PDFs
    python3 cli/storyquest.py html my-pack.json             # -> HTML files to open in a browser

Needs Python 3.9+ and Google Chrome, Chromium or Microsoft Edge. Nothing else.
If pdftoppm (poppler) and Pillow are installed, `build` also checks that nothing is
printed inside the page margins.

The layout itself is the same JavaScript engine the web page uses (engine/storyquest.js),
run inside headless Chrome, so the CLI and the web page always produce the same pages.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE = ROOT / "engine"

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]

# The page the CLI hands to Chrome: loads the engine, renders the pack, fits each page to one
# sheet once fonts are in, and records the validate() and fit reports on <html> for --dump-dom.
SHELL = """<!doctype html><html lang="en"><head><meta charset="utf-8"><title>StoryQuest</title>
<link rel="stylesheet" href="{base}storyquest.css">
<script src="{base}art.js"></script><script src="{base}storyquest.js"></script></head>
<body style="margin:0;background:#fff"><div id="root"></div>
<script type="application/json" id="pack">{pack}</script>
<script>
(function () {{
  var pack = JSON.parse(document.getElementById('pack').textContent), which = {which};
  var st = document.createElement('style');
  st.textContent = StoryQuest.pageCSS(pack) + ' @media print{{body{{margin:0}}}}';
  document.head.appendChild(st);
  var root = document.getElementById('root');
  root.className = StoryQuest.rootClass(pack);
  root.innerHTML = (which === 'guide' ? [StoryQuest.renderGuide(pack)] : StoryQuest.renderPacket(pack)).join('');
  document.documentElement.setAttribute('data-issues', JSON.stringify(StoryQuest.validate(pack)));
  document.fonts.ready.then(function () {{
    document.documentElement.setAttribute('data-fit', JSON.stringify(StoryQuest.fitPages(root)));
  }});
}})();
</script></body></html>"""


def find_chrome() -> str:
    env = os.environ.get("STORYQUEST_CHROME")
    if env:
        return env
    for c in CHROME_CANDIDATES:
        if os.path.isabs(c) and os.path.exists(c):
            return c
        found = shutil.which(c)
        if found:
            return found
    sys.exit("StoryQuest needs Google Chrome, Chromium or Microsoft Edge to make PDFs.\n"
             "Install one, or set STORYQUEST_CHROME to its path.")


def load_pack(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Same forgiveness as the web page: strip code fences / chatter, smart quotes, trailing commas.
        m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.I)
        t = m.group(1) if m else text
        a, b = t.find("{"), t.rfind("}")
        if a < 0 or b < a:
            sys.exit(f"{path}: this doesn't look like a StoryQuest pack (no JSON object found).")
        t = t[a:b + 1].replace("\u201c", '"').replace("\u201d", '"').replace("\u2018", "'").replace("\u2019", "'")
        t = re.sub(r",\s*([}\]])", r"\1", t)
        try:
            return json.loads(t)
        except json.JSONDecodeError as e:
            sys.exit(f"{path}: the pack isn't valid JSON ({e}). Ask the AI to send it again as one code block.")


def shell_html(pack: dict, which: str) -> str:
    # "<" only ever appears inside JSON strings, so \u003c is the same data and keeps
    # "</script>" and "<!--" from changing how the browser parses the script block.
    data = json.dumps(pack, ensure_ascii=False).replace("<", "\\u003c")
    return SHELL.format(base=ENGINE.as_uri() + "/", pack=data, which=json.dumps(which))


def chrome(args: list[str], url: str, timeout: int = 90) -> subprocess.CompletedProcess:
    profile = tempfile.mkdtemp(prefix="storyquest-chrome-")
    try:
        cmd = [find_chrome(), "--headless", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
               "--allow-file-access-from-files", f"--user-data-dir={profile}", "--virtual-time-budget=15000", *args, url]
        try:
            return subprocess.run(cmd, capture_output=True, timeout=timeout, text=True)
        except subprocess.TimeoutExpired:
            sys.exit("Chrome took too long to lay out this pack. It may be far too big: ask the AI to shorten it.")
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def reports(html_path: Path) -> tuple[list, list]:
    out = chrome(["--dump-dom"], html_path.as_uri()).stdout
    def attr(name):
        m = re.search(rf'<html[^>]*\s{name}="([^"]*)"', out)
        return json.loads(unescape(m.group(1))) if m else None
    issues, fit = attr("data-issues"), attr("data-fit")
    if issues is None:
        sys.exit("Chrome couldn't run the StoryQuest engine. Try updating Chrome, or set STORYQUEST_CHROME.")
    return issues, fit or []


def pdf_pages(pdf: Path) -> int:
    b = pdf.read_bytes()
    return len(re.findall(rb"/Type\s*/Page\b", b))


def margin_check(pdf: Path, pack: dict) -> list[str]:
    """Render at 100dpi and confirm all ink sits inside the margins. Skipped if tools are missing."""
    if not shutil.which("pdftoppm"):
        return ["(margin check skipped: install poppler for pdftoppm)"]
    try:
        from PIL import Image, ImageChops
    except ImportError:
        return ["(margin check skipped: pip install pillow)"]
    opts = pack.get("options") or {}
    left = 1.25 if opts.get("hole_punch_margin", True) is not False else 0.55
    w_in, h_in = (8.27, 11.69) if opts.get("paper") == "a4" else (8.5, 11.0)
    lim = {"x0": int(left * 100) - 2, "x1": int((w_in - 0.35) * 100) + 2,
           "y0": int(0.45 * 100) - 2, "y1": int((h_in - 0.45) * 100) + 2}
    problems = []
    with tempfile.TemporaryDirectory() as d:
        subprocess.run(["pdftoppm", "-r", "100", "-png", str(pdf), str(Path(d) / "p")], check=True,
                       stderr=subprocess.DEVNULL)  # poppler warns about pixel-font glyph boxes; harmless
        for i, png in enumerate(sorted(Path(d).glob("p*.png")), 1):
            im = Image.open(png).convert("L")
            ink = ImageChops.invert(im).point(lambda v: 255 if v > 6 else 0).getbbox()
            if not ink:
                continue
            x0, y0, x1, y1 = ink
            if x0 < lim["x0"] or x1 > lim["x1"] or y0 < lim["y0"] or y1 > lim["y1"]:
                problems.append(f"page {i}: printing reaches into the margin (ink box {ink}, allowed "
                                f"{lim['x0']}-{lim['x1']} x {lim['y0']}-{lim['y1']})")
    return problems


def slug(path: Path) -> str:
    s = re.sub(r"\.storyquest$", "", path.stem)
    return re.sub(r"[^A-Za-z0-9._-]+", "-", s).strip("-") or "storyquest"


def print_reports(issues: list, fit: list) -> int:
    errors = 0
    for i in issues:
        print(f"  {i['level'].upper():8s} {i['message']}")
        errors += i["level"] == "error"
    for f in fit:
        print(f"  {'ERROR' if f['level'] == 'error' else 'FIT':8s} {f['message']}")
        errors += f["level"] == "error"
    return errors


def cmd_check(args) -> int:
    pack = load_pack(args.pack)
    with tempfile.TemporaryDirectory() as d:
        h = Path(d) / "packet.html"
        h.write_text(shell_html(pack, "packet"), encoding="utf-8")
        issues, fit = reports(h)
    errors = print_reports(issues, fit)
    print("OK: ready to print" if not errors else f"{errors} problem(s) to fix before printing")
    return 1 if errors else 0


def cmd_build(args, html_only=False) -> int:
    pack = load_pack(args.pack)
    out = Path(args.out or args.pack.parent)
    out.mkdir(parents=True, exist_ok=True)
    name = slug(args.pack)
    n_quests = len(pack.get("quests") or [])
    errors = 0
    for which in (["packet", "guide"] if args.which == "both" else [args.which]):
        h = out / f"{name}-{which}.html"
        h.write_text(shell_html(pack, which), encoding="utf-8")
        if html_only:
            print(f"{h}")
            continue
        issues, fit = reports(h)
        if which == "packet":
            errors += print_reports(issues, fit)
        pdf = out / f"{name}-{which}.pdf"
        r = chrome(["--no-pdf-header-footer", f"--print-to-pdf={pdf}"], h.as_uri())
        if not pdf.exists():
            print(f"  ERROR    Chrome didn't write {pdf.name}: {r.stderr.strip()[-300:]}")
            errors += 1
            continue
        pages = pdf_pages(pdf)
        note = ""
        if which == "packet" and pages != n_quests + 1:
            note = f"  <-- expected {n_quests + 1} (cover + one per quest): a page overflowed"
            errors += 1
        print(f"{pdf}  {pages} pages{note}")
        if args.margins:
            for p in margin_check(pdf, pack):
                print(f"  {'NOTE' if p.startswith('(') else 'ERROR':8s} {p}")
                errors += not p.startswith("(")
        if not args.keep_html:
            h.unlink()
    return 1 if errors else 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="storyquest", description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    for name, help_ in (("build", "make PDFs"), ("check", "validate and check page fit"), ("html", "write HTML files only")):
        p = sub.add_parser(name, help=help_)
        p.add_argument("pack", type=Path, help="the pack file (.json) the AI wrote")
        if name != "check":
            p.add_argument("--out", help="folder for the output (default: next to the pack)")
            p.add_argument("--which", choices=["both", "packet", "guide"], default="both")
        if name == "build":
            p.add_argument("--keep-html", action="store_true", help="keep the HTML next to the PDFs")
            p.add_argument("--no-margin-check", dest="margins", action="store_false")
    args = ap.parse_args(argv)
    if not args.pack.exists():
        sys.exit(f"Can't find {args.pack}")
    if args.cmd == "check":
        return cmd_check(args)
    return cmd_build(args, html_only=args.cmd == "html")


if __name__ == "__main__":
    sys.exit(main())
