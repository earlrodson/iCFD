#!/usr/bin/env python3
"""
Seed ALL CCC paragraphs (1–2865) from the local PDF for the Catechism browser.
Extends seed-ccc-paragraphs.py — same parsing logic, full range, adds part metadata.
Run from project root:
  python3 scripts/seed-ccc-full.py
Requires: pip install pdfplumber  (or use the venv from earlier)
"""

import os
import re
import json
import urllib.request
import urllib.error

try:
    import pdfplumber
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pdfplumber', '-q'])
    import pdfplumber

PDF_PATH = os.environ.get("CCC_PDF_PATH", "documents/Catechism of the Catholic Church.pdf")
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# All valid CCC paragraph numbers
FULL_RANGE = set(range(1, 2866))

def get_section(n: int) -> str:
    if n <= 1065: return "Part One: The Profession of Faith"
    if n <= 1690: return "Part Two: The Celebration of the Christian Mystery"
    if n <= 2557: return "Part Three: Life in Christ"
    return "Part Four: Christian Prayer"

def make_summary(text: str) -> str:
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    summary = sentences[0]
    if len(summary) < 80 and len(sentences) > 1:
        summary += ' ' + sentences[1]
    return summary[:220].strip()

def clean_line(line: str) -> str:
    """Strip trailing cross-reference numbers like '355, 170' or '1718'."""
    return re.sub(r'\s+\d[\d,\s\-]*$', '', line).rstrip()

def extract_paragraphs(needed: set) -> dict:
    print(f"Extracting {len(needed)} paragraphs from PDF...")
    pages_text = []

    # Pages 1-26 are front matter (TOC, indices, Apostolic Constitution).
    # Pages 709+ are back-matter indices. Actual paragraph content: pages 27-708.
    CONTENT_START = 26   # 0-indexed (page 27)
    CONTENT_END   = 708  # 0-indexed exclusive (page 708 inclusive)

    with pdfplumber.open(PDF_PATH) as pdf:
        total = len(pdf.pages)
        content_pages = pdf.pages[CONTENT_START:CONTENT_END]
        for i, page in enumerate(content_pages):
            t = page.extract_text()
            if t:
                pages_text.append(t)
            if (i + 1) % 100 == 0:
                print(f"  {i+1}/{len(content_pages)} pages read...")

    cleaned_lines = []
    for page_text in pages_text:
        for line in page_text.splitlines():
            line = clean_line(line)
            if line:
                cleaned_lines.append(line)

    full_text = '\n'.join(cleaned_lines)
    full_text = re.sub(r'-\n', '', full_text)

    para_re = re.compile(r'^(\d{1,4}) ([A-Z""\'(])', re.MULTILINE)
    starts = [(m.start(), int(m.group(1)), m.start(2)) for m in para_re.finditer(full_text)]

    extracted = {}
    for idx, (pos, num, text_start) in enumerate(starts):
        if num < 1 or num > 2865:
            continue
        if num not in needed:
            continue
        end = starts[idx + 1][0] if idx + 1 < len(starts) else len(full_text)
        raw = full_text[text_start:end]
        raw = re.sub(r'\n+', ' ', raw)
        raw = re.sub(r'\s{2,}', ' ', raw)
        raw = re.sub(r'(\w)(\d{1,2})(?=\s|$)', r'\1', raw)
        raw = raw.strip()
        if len(raw) < 20:
            continue
        if num not in extracted or len(raw) > len(extracted[num]):
            extracted[num] = raw

    return extracted

def upsert_batch(rows, retries=3):
    url = f"{SUPABASE_URL}/rest/v1/ccc_paragraphs?on_conflict=paragraph,lang"
    data = json.dumps(rows).encode()
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, data=data, method="POST",
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates,return=minimal",
                }
            )
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, None
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode()[:300]
        except Exception as e:
            if attempt < retries - 1:
                import time; time.sleep(2 ** attempt)
            else:
                return 0, str(e)

def get_already_populated() -> set:
    """Return paragraph numbers that already have text in the DB."""
    url = f"{SUPABASE_URL}/rest/v1/ccc_paragraphs?lang=eq.en&text=not.is.null&select=paragraph"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Range": "0-2999",
    })
    try:
        with urllib.request.urlopen(req) as r:
            data = json.loads(r.read())
            return {row['paragraph'] for row in data}
    except Exception:
        return set()

def main():
    print("Checking which paragraphs already have content...")
    populated = get_already_populated()
    print(f"  {len(populated)} already populated, skipping those.")

    needed = FULL_RANGE - populated
    print(f"  {len(needed)} paragraphs to extract and seed.\n")

    if not needed:
        print("All paragraphs already populated!")
        return

    extracted = extract_paragraphs(needed)
    print(f"\nExtracted {len(extracted)} / {len(needed)} paragraphs from PDF")

    missing = needed - set(extracted.keys())
    if missing and len(missing) <= 50:
        print(f"Could not extract {len(missing)}: {sorted(missing)}")
    elif missing:
        print(f"Could not extract {len(missing)} paragraphs (likely prologue/appendix range or index pages)")

    rows = [
        {
            "paragraph": num,
            "lang": "en",
            "text": text,
            "summary": make_summary(text),
            "section": get_section(num),
        }
        for num, text in sorted(extracted.items())
    ]

    print(f"\nUpserting {len(rows)} paragraphs...")
    batch_size = 50
    total_upserted = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        status, err = upsert_batch(batch)
        if err:
            print(f"  ERROR at row {i}: {status} — {err}")
            break
        total_upserted += len(batch)
        if (i // batch_size) % 20 == 0:
            print(f"  {total_upserted}/{len(rows)} upserted...")

    print(f"\nDone. {total_upserted}/{len(rows)} paragraphs upserted.")

if __name__ == "__main__":
    main()
