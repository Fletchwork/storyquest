"""CLI tests: python3 -m pytest -q. The PDF test runs only where Chrome is installed."""
import importlib.util
import json
import shutil
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("storyquest_cli", ROOT / "cli" / "storyquest.py")
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)

PACK = {
    "storyquest": 1,
    "book": {"title": "Test Book", "author": "A. Writer", "format": "ereader"},
    "reader": {"name": "Sam", "age": 10},
    "quests": [{"title": "One", "activities": [{"type": "questions", "items": ["Why?"]}]},
               {"title": "Two", "activities": [{"type": "rating"}]}],
    "guide": {"sources": "Checked.", "quests": [{"answers": ["x"]}, {}]},
}


def test_load_pack_plain(tmp_path):
    f = tmp_path / "p.json"
    f.write_text(json.dumps(PACK))
    assert cli.load_pack(f)["book"]["title"] == "Test Book"


def test_load_pack_forgives_chatty_ai_output(tmp_path):
    f = tmp_path / "p.txt"
    f.write_text('Sure!\n```json\n{“book”: {“title”: “X”},}\n```\nHave fun!', encoding="utf-8")
    assert cli.load_pack(f)["book"]["title"] == "X"


def test_load_pack_rejects_non_pack(tmp_path):
    f = tmp_path / "p.txt"
    f.write_text("no json at all")
    with pytest.raises(SystemExit):
        cli.load_pack(f)


def test_shell_html_cannot_break_out_of_script_tag():
    p = json.loads(json.dumps(PACK))
    p["book"]["title"] = "<!--<script></script><script>alert(1)</script>"
    html = cli.shell_html(p, "packet")
    data = html.split('id="pack">', 1)[1].split("</script>", 1)[0]
    assert "<" not in data
    assert json.loads(data)["book"]["title"] == p["book"]["title"]


def test_slug():
    assert cli.slug(Path("charlottes-web.storyquest.json")) == "charlottes-web"
    assert cli.slug(Path("My Pack!.json")) == "My-Pack"


def _chrome():
    try:
        return cli.find_chrome()
    except SystemExit:
        return None


@pytest.mark.skipif(_chrome() is None, reason="needs Chrome/Chromium/Edge")
def test_build_makes_one_sheet_per_quest(tmp_path):
    f = tmp_path / "t.json"
    f.write_text(json.dumps(PACK))
    rc = cli.main(["build", str(f), "--no-margin-check"])
    assert rc == 0
    assert cli.pdf_pages(tmp_path / "t-packet.pdf") == 3
    assert (tmp_path / "t-guide.pdf").exists()


@pytest.mark.skipif(_chrome() is None, reason="needs Chrome/Chromium/Edge")
@pytest.mark.parametrize("example", sorted((ROOT / "examples").glob("*.json")), ids=lambda p: p.stem)
def test_examples_fit(example):
    assert cli.main(["check", str(example)]) == 0


THEMES = ["pixel-quest", "storybook", "clean", "pirate-seas", "enchanted-forest",
          "space-voyage", "mystery-case", "wild-adventure", "notebook"]


@pytest.mark.skipif(_chrome() is None, reason="needs Chrome/Chromium/Edge")
@pytest.mark.parametrize("theme", THEMES)
def test_every_look_fits_one_sheet_per_quest(tmp_path, theme):
    """The Treasure Island example, dressed in each look, still prints one sheet per quest."""
    pack = json.loads((ROOT / "examples" / "treasure-island.json").read_text())
    pack["theme"] = theme
    f = tmp_path / "ti.json"
    f.write_text(json.dumps(pack))
    assert cli.main(["check", str(f)]) == 0
    assert cli.main(["build", str(f), "--no-margin-check"]) == 0
    assert cli.pdf_pages(tmp_path / "ti-packet.pdf") == len(pack["quests"]) + 1
