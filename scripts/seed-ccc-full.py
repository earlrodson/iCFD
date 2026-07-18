#!/usr/bin/env python3
"""
Seed ALL CCC paragraphs (1–2865) from documents/catechism.json.
Run from project root:
  NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... python3 scripts/seed-ccc-full.py
"""

import os
import re
import json
import time
import urllib.request
import urllib.error

JSON_PATH    = os.environ.get("CCC_JSON_PATH", "documents/catechism.json")
SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SECRET_KEY"]

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

def get_already_populated() -> set:
    url = f"{SUPABASE_URL}/rest/v1/ccc_paragraphs?lang=eq.en&text=not.is.null&select=paragraph&limit=3000"
    req = urllib.request.Request(url, headers={
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return {row['paragraph'] for row in json.loads(r.read())}
    except Exception as e:
        print(f"  Warning: could not fetch existing paragraphs ({e}), will upsert all.")
        return set()

def upsert_batch(rows: list, retries: int = 3):
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
                time.sleep(2 ** attempt)
            else:
                return 0, str(e)

def main():
    print(f"Loading {JSON_PATH}...")
    with open(JSON_PATH, encoding="utf-8") as f:
        entries = json.load(f)
    print(f"  {len(entries)} paragraphs in JSON.")

    print("Checking which paragraphs already have content in DB...")
    populated = get_already_populated()
    print(f"  {len(populated)} already populated, skipping those.")

    rows = []
    for entry in entries:
        num  = entry["id"]
        text = entry["text"].strip()
        if not text or num in populated:
            continue
        rows.append({
            "paragraph": num,
            "lang":      "en",
            "text":      text,
            "summary":   make_summary(text),
            "section":   get_section(num),
        })

    if not rows:
        print("All paragraphs already populated!")
        return

    print(f"  {len(rows)} paragraphs to upsert.\n")

    batch_size    = 50
    total_upserted = 0
    for i in range(0, len(rows), batch_size):
        batch  = rows[i:i + batch_size]
        status, err = upsert_batch(batch)
        if err:
            print(f"  ERROR at row {i}: {status} — {err}")
            raise SystemExit(1)
        total_upserted += len(batch)
        if (i // batch_size) % 10 == 0:
            print(f"  {total_upserted}/{len(rows)} upserted...")

    print(f"\nDone. {total_upserted}/{len(rows)} paragraphs upserted.")

if __name__ == "__main__":
    main()
