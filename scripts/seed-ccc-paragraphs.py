#!/usr/bin/env python3
"""
Extract CCC paragraphs from PDF and upsert into Supabase ccc_paragraphs table.
Cross-references appear at line ends (e.g. "...to draw 355, 170") — stripped before parsing.
"""

import os
import re
import json
import urllib.request
import urllib.error
import pdfplumber

PDF_PATH = os.environ.get("CCC_PDF_PATH", "documents/Catechism of the Catholic Church.pdf")
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

NEEDED = {
    66, 67, 76, 78, 80, 81, 82, 83, 95, 97, 105, 107, 115, 116, 117, 119, 120, 126, 138,
    232, 242, 253, 261, 266,
    402, 403, 404, 405, 466, 491, 492, 493, 495, 496, 499, 500, 502, 507, 509,
    525, 526, 563,
    721, 722, 811, 827, 828, 830, 834, 857, 861, 862, 869, 880, 881, 882, 883, 884, 885, 890, 891,
    936, 954, 955, 956, 957, 962, 966, 969, 970, 971, 974,
    1023, 1030, 1031, 1032, 1033, 1035, 1037,
    1163, 1168, 1171, 1235, 1250, 1251, 1252, 1257,
    1285, 1288, 1302, 1316,
    1362, 1364, 1366, 1372, 1374, 1375, 1376, 1377, 1380, 1413,
    1422, 1434, 1438, 1440, 1444, 1446, 1449, 1455, 1456, 1461, 1471, 1478, 1479,
    1496, 1498, 1499, 1511, 1514, 1520, 1536, 1546, 1562, 1577, 1579, 1580, 1618, 1652,
    1987, 1988, 1996, 2003, 2008, 2010, 2035, 2043,
    2132, 2157, 2174, 2176, 2190,
    2370, 2399, 2400, 2412,
    2676, 2677, 2678, 2679, 2683, 2684, 2708,
}

def get_section(n):
    if n <= 1065:
        return "Part One: The Profession of Faith"
    elif n <= 1690:
        return "Part Two: The Celebration of the Christian Mystery"
    elif n <= 2557:
        return "Part Three: Life in Christ"
    else:
        return "Part Four: Christian Prayer"

def make_summary(text):
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    summary = sentences[0]
    if len(summary) < 80 and len(sentences) > 1:
        summary = summary + " " + sentences[1]
    return summary[:220].strip()

def clean_line(line):
    """Strip trailing cross-reference numbers like '355, 170' or '1718' or '2123-2128'."""
    return re.sub(r'\s+\d[\d,\s\-]*$', '', line).rstrip()

def extract_paragraphs():
    print("Extracting text from PDF...")
    pages_text = []

    with pdfplumber.open(PDF_PATH) as pdf:
        total = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            t = page.extract_text()
            if t:
                pages_text.append(t)
            if (i + 1) % 100 == 0:
                print(f"  {i+1}/{total} pages...")

    # Clean each line: strip trailing cross-references, hyphen-break joins
    cleaned_lines = []
    for page_text in pages_text:
        for line in page_text.splitlines():
            line = clean_line(line)
            if line:
                cleaned_lines.append(line)

    full_text = '\n'.join(cleaned_lines)

    # Fix hyphenated line-breaks: "acknow-\nledges" → "acknowledges"
    full_text = re.sub(r'-\n', '', full_text)

    print("Parsing paragraphs...")

    # Paragraph start: line beginning with 1-4 digits, space, then letter/quote
    # Must be at start of line (^) in multiline mode
    para_re = re.compile(r'^(\d{1,4}) ([A-Z“"\'(])', re.MULTILINE)

    starts = [(m.start(), int(m.group(1)), m.start(2)) for m in para_re.finditer(full_text)]

    extracted = {}
    for idx, (pos, num, text_start) in enumerate(starts):
        # Only keep paragraph numbers in realistic CCC range
        if num < 26 or num > 2865:
            continue
        if num not in NEEDED:
            continue

        end = starts[idx + 1][0] if idx + 1 < len(starts) else len(full_text)
        raw = full_text[text_start:end]

        # Remove block-quote lines (heavily indented in PDF — appear as standalone lines
        # that don't start with a capital after a number)
        # Join continuation lines
        raw = re.sub(r'\n+', ' ', raw)
        raw = re.sub(r'\s{2,}', ' ', raw)
        # Strip footnote markers: superscript digits attached to words
        raw = re.sub(r'(\w)(\d{1,2})(?=\s|$)', r'\1', raw)
        raw = raw.strip()

        if len(raw) < 20:
            continue

        if num not in extracted or len(raw) > len(extracted[num]):
            extracted[num] = raw

    return extracted

def upsert_batch(rows):
    url = f"{SUPABASE_URL}/rest/v1/ccc_paragraphs"
    data = json.dumps(rows).encode()
    req = urllib.request.Request(
        url, data=data, method="POST",
        headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates",
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, None
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

def main():
    extracted = extract_paragraphs()
    print(f"\nExtracted {len(extracted)} / {len(NEEDED)} needed paragraphs")

    missing = NEEDED - set(extracted.keys())
    if missing:
        print(f"Could not find: {sorted(missing)}")

    for num in sorted(list(extracted.keys()))[:5]:
        print(f"\n  [{num}] {extracted[num][:120]}...")

    rows = [
        {
            "paragraph": num,
            "text": text,
            "summary": make_summary(text),
            "section": get_section(num),
        }
        for num, text in sorted(extracted.items())
    ]

    total_upserted = 0
    batch_size = 20
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        nums = [r["paragraph"] for r in batch]
        status, err = upsert_batch(batch)
        if err:
            print(f"  ERROR {nums[0]}-{nums[-1]}: {status} {err[:200]}")
        else:
            print(f"  Upserted {nums[0]}–{nums[-1]}")
            total_upserted += len(batch)

    print(f"\nDone. {total_upserted}/{len(rows)} upserted.")

if __name__ == "__main__":
    main()
