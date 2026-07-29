#!/usr/bin/env python
"""Generate the Music Braille documentation PDFs from the markdown sources.

Renders src/Plugins/Braille/README.md  -> export/OSMD_Braille_Module_Documentation.pdf
    and src/Plugins/Braille/UserGuide.md -> export/OSMD_Braille_User_Guide.pdf
(markdown -> HTML -> headless Chrome --print-to-pdf, A4).

The PDFs are deliberately NOT committed to the repository (an already-compressed binary
that changes with every documentation edit would grow the git history by its full size
each time). Instead, attach the generated files to the GitHub release (or an issue
comment) and regenerate them here whenever the markdown changes; the markdown files in
the repository are the always-current source of truth.

Prerequisites:
  - pip install markdown pypdf
  - Google Chrome (path autodetected; override with the CHROME environment variable)
  - internet access (the developer doc renders its mermaid diagrams via CDN)
  - current demo screenshots in src/Plugins/Braille/img/
    (refresh with bin/braille/generate_braille_doc_screenshots.mjs after demo UI changes)

Usage: python bin/braille/generate_braille_doc_pdfs.py
"""
import datetime
import html
import os
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import markdown
from pypdf import PdfReader

REPO = Path(__file__).resolve().parents[2]
OUT_DIR = REPO / "export"
BRAILLE_DIR = REPO / "src/Plugins/Braille"
IMG_URI = (BRAILLE_DIR / "img").as_uri()
# repo-relative doc links are rewritten to public GitHub URLs, so the standalone
# PDFs never point into the local folder structure (no file:// links allowed)
PUBLIC_BASE = "https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/blob/develop/src/Plugins/Braille/"
SUBTITLE_DATE = datetime.date.today().strftime("%B %Y")

CHROME_CANDIDATES = [
    os.environ.get("CHROME"),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
]
CHROME = next((c for c in CHROME_CANDIDATES if c and Path(c).exists()), None)
if not CHROME:
    sys.exit("Chrome not found -- set the CHROME environment variable to its executable.")

PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>__TITLE__</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", "Segoe UI Symbol", Arial, sans-serif;
    font-size: 10.5pt; line-height: 1.5; color: #1a1a1a; margin: 0;
  }
  h1 { font-size: 20pt; line-height: 1.25; margin: 0 0 4pt 0; color: #111; }
  .subtitle { color: #666; margin: 0 0 18pt 0; font-size: 10.5pt;
              border-bottom: 2px solid #333; padding-bottom: 10pt; }
  h2 { font-size: 15pt; margin: 22pt 0 8pt 0; padding-top: 6pt;
       border-top: 1px solid #ccc; break-after: avoid; }
  h3 { font-size: 12.5pt; margin: 16pt 0 6pt 0; break-after: avoid; }
  h4 { font-size: 11pt; margin: 12pt 0 4pt 0; break-after: avoid; }
  p { margin: 6pt 0; }
  a { color: #0b57a4; text-decoration: none; word-break: break-all; }
  code, pre {
    font-family: Consolas, "Segoe UI Symbol", "Courier New", monospace;
    font-size: __CODE_SIZE__;
  }
  code { background: #f2f2f2; padding: 0.5pt 3pt; border-radius: 2pt; }
  pre {
    background: #f7f7f7; border: 1px solid #ddd; border-radius: 3pt;
    padding: 8pt; overflow-x: auto; line-height: 1.4; break-inside: avoid;
    __PRE_EXTRA__
  }
  pre code { background: none; padding: 0; __PRE_CODE_EXTRA__ }
  table {
    border-collapse: collapse; margin: 8pt 0; font-size: 9.5pt; width: 100%;
    break-inside: avoid;
  }
  th, td { border: 1px solid #ccc; padding: 3pt 6pt; text-align: left; vertical-align: top; }
  th { background: #efefef; }
  blockquote { __BLOCKQUOTE__ }
  hr { border: none; border-top: 1px solid #ccc; margin: 14pt 0; }
  ul, ol { margin: 6pt 0; padding-left: 22pt; }
  li { margin: 2pt 0; }
  img {
    max-width: 100%; height: auto; display: block;
    margin: 10pt auto; border: 1px solid #ddd; border-radius: 3pt;
    break-inside: avoid;
  }
  .mermaid {
    text-align: center; margin: 10pt 0; break-inside: avoid;
    font-family: "Segoe UI", sans-serif;
  }
  .mermaid svg { max-width: 100%; height: auto; }
</style>
__HEAD_EXTRA__
</head>
<body>
__BODY__
</body>
</html>
"""

MERMAID_HEAD = """<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
  if (window.mermaid) {
    mermaid.initialize({ startOnLoad: true, theme: "neutral",
                         flowchart: { htmlLabels: true } });
  }
</script>"""


def github_slugify(value, separator="-"):
    """Mimic GitHub heading anchors: lowercase, drop punctuation, spaces -> hyphens."""
    value = value.lower()
    value = re.sub(r"[^\w\- ]", "", value)
    return value.replace(" ", separator)


def md_to_body(md_path, subtitle, mermaid=False):
    md_text = md_path.read_text(encoding="utf-8")
    body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc"],
        extension_configs={"toc": {"slugify": github_slugify}},
    )
    body = body.replace('src="img/', f'src="{IMG_URI}/')
    if mermaid:
        body, n_mermaid = re.subn(
            r'<pre><code class="language-mermaid">(.*?)</code></pre>',
            lambda m: '<div class="mermaid">' + html.unescape(m.group(1)) + "</div>",
            body, flags=re.S,
        )
        print(f"  mermaid blocks converted: {n_mermaid}")
    body, n_links = re.subn(r'href="((?:README|UserGuide)\.md[^"]*)"',
                            lambda m: f'href="{PUBLIC_BASE}{m.group(1)}"', body)
    print(f"  doc links mapped to public repo: {n_links}")
    body = body.replace("</h1>", f'</h1><p class="subtitle">{subtitle}</p>', 1)
    return body


def print_pdf(html_path, out_pdf):
    cmd = [
        CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
        "--virtual-time-budget=20000", "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={out_pdf}", Path(html_path).as_uri(),
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if r.returncode != 0 or not out_pdf.exists():
        sys.exit(f"Chrome PDF print failed (exit {r.returncode}):\n{r.stderr[-500:]}")


def verify(out_pdf, probes):
    """Common sanity checks; returns True when all pass."""
    reader = PdfReader(str(out_pdf))
    text = "".join((p.extract_text() or "") for p in reader.pages)
    text_normalized = re.sub(r"\s+", " ", text)  # extraction breaks phrases across lines
    bad_uris = [str(uri) for pg in reader.pages for annot in (pg.get("/Annots") or [])
                if (uri := (annot.get_object().get("/A") or {}).get("/URI"))
                and str(uri).startswith("file:")]
    ok = not bad_uris
    print(f"  pages: {len(reader.pages)} | size: {out_pdf.stat().st_size} bytes")
    if bad_uris:
        print(f"  FAIL: file:// link annotations present: {bad_uris[:3]}")
    for label, probe in probes:
        hit = probe in text_normalized
        ok = ok and hit
        print(f"  {'ok  ' if hit else 'FAIL'} {label}")
    return ok


def main():
    OUT_DIR.mkdir(exist_ok=True)
    all_ok = True

    print("User guide PDF:")
    body = md_to_body(BRAILLE_DIR / "UserGuide.md",
                      f"OpenSheetMusicDisplay &middot; User Documentation &middot; {SUBTITLE_DATE}")
    page = (PAGE_TEMPLATE
            .replace("__TITLE__", "Music Braille in OpenSheetMusicDisplay - User Guide")
            .replace("__CODE_SIZE__", "9.5pt")
            .replace("__PRE_EXTRA__", "font-size: 12pt;")
            .replace("__PRE_CODE_EXTRA__", "font-size: 12pt;")
            .replace("__BLOCKQUOTE__",
                     "margin: 10pt 0; padding: 4pt 12pt; border-left: 3pt solid #d95f02;"
                     " color: #333; background: #fdf6f0;")
            .replace("__HEAD_EXTRA__", "")
            .replace("__BODY__", body))
    html_path = OUT_DIR / "braille_userguide.html"
    html_path.write_text(page, encoding="utf-8")
    out_pdf = OUT_DIR / "OSMD_Braille_User_Guide.pdf"
    print_pdf(html_path, out_pdf)
    all_ok &= verify(out_pdf, [
        ("braille scale example present", "\u2810\u2839\u2831"),
        ("demo URL present", "osmd-braille-demo"),
        ("?braille=1 parameter documented", "braille=1"),
    ])

    print("Developer documentation PDF:")
    body = md_to_body(BRAILLE_DIR / "README.md",
                      f"OpenSheetMusicDisplay &middot; Developer Documentation &middot; {SUBTITLE_DATE}",
                      mermaid=True)
    page = (PAGE_TEMPLATE
            .replace("__TITLE__", "OSMD Braille Module - Developer Documentation")
            .replace("__CODE_SIZE__", "9pt")
            .replace("__PRE_EXTRA__", "")
            .replace("__PRE_CODE_EXTRA__", "")
            .replace("__BLOCKQUOTE__",
                     "margin: 8pt 0; padding: 2pt 10pt; border-left: 3pt solid #bbb;"
                     " color: #444; background: #fafafa;")
            .replace("__HEAD_EXTRA__", MERMAID_HEAD)
            .replace("__BODY__", body))
    html_path = OUT_DIR / "braille_readme.html"
    html_path.write_text(page, encoding="utf-8")
    out_pdf = OUT_DIR / "OSMD_Braille_Module_Documentation.pdf"
    print_pdf(html_path, out_pdf)
    all_ok &= verify(out_pdf, [
        ("content check (Who is it for)", "Who is it for"),
        ("options table present", "BrailleOptions"),
    ])
    # raw mermaid source leaking into the text layer would mean the diagrams did not render
    reader = PdfReader(str(out_pdf))
    text = "".join((p.extract_text() or "") for p in reader.pages)
    mermaid_ok = "flowchart TD" not in text
    print(f"  {'ok  ' if mermaid_ok else 'FAIL'} mermaid diagrams rendered")
    all_ok &= mermaid_ok

    print("done -> attach the PDFs from export/ to the GitHub release (or issue)."
          if all_ok else "FAILED -- see messages above.")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
