#!/usr/bin/env python3
"""
Download and import Bible translations into scripture_verses table.
Usage:
  python3 scripts/import-bible.py --version NABRE
  python3 scripts/import-bible.py --version DR
  python3 scripts/import-bible.py --version all
"""

import os
import argparse
import json
import urllib.request
import urllib.error
import urllib.parse
import re
import sys

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# GitHub raw content base URLs
NABRE_BASE = "https://raw.githubusercontent.com/nirmalben/bible-nabre-json-dataset/master/generated_data/books"
DR_BASE    = "https://raw.githubusercontent.com/xxruyle/Bible-DouayRheims/main/Douay-Rheims"

# Canonical book list:
# (canonical_name, nabre_filename, dr_filename, book_code, testament)
# canonical_name is used in the `reference` field for ALL translations so lookups match.
# DR uses traditional Latin names; mapped to canonical here.
# DR book numbering differs: DR 1-2 Kings = 1-2 Samuel; DR 3-4 Kings = 1-2 Kings;
# DR 1-2 Paralipomenon = 1-2 Chronicles; DR 1-2 Esdras = Ezra/Nehemiah.
BOOKS = [
    # Old Testament
    ("Genesis",          "Genesis",        "Genesis",             "GEN", "OT"),
    ("Exodus",           "Exodus",         "Exodus",              "EXO", "OT"),
    ("Leviticus",        "Leviticus",      "Leviticus",           "LEV", "OT"),
    ("Numbers",          "Numbers",        "Numbers",             "NUM", "OT"),
    ("Deuteronomy",      "Deuteronomy",    "Deuteronomy",         "DEU", "OT"),
    ("Joshua",           "Joshua",         "Josue",               "JOS", "OT"),
    ("Judges",           "Judges",         "Judges",              "JDG", "OT"),
    ("Ruth",             "Ruth",           "Ruth",                "RUT", "OT"),
    ("1 Samuel",         "1Samuel",        "1 Kings",             "1SA", "OT"),  # DR: 1 Kings = 1 Samuel
    ("2 Samuel",         "2Samuel",        "2 Kings",             "2SA", "OT"),  # DR: 2 Kings = 2 Samuel
    ("1 Kings",          "1Kings",         "3 Kings",             "1KI", "OT"),  # DR: 3 Kings = 1 Kings
    ("2 Kings",          "2Kings",         "4 Kings",             "2KI", "OT"),  # DR: 4 Kings = 2 Kings
    ("1 Chronicles",     "1Chronicles",    "1 Paralipomenon",     "1CH", "OT"),
    ("2 Chronicles",     "2Chronicles",    "2 Paralipomenon",     "2CH", "OT"),
    ("Ezra",             "Ezra",           "1 Esdras",            "EZR", "OT"),  # DR: 1 Esdras = Ezra
    ("Nehemiah",         "Nehemiah",       "2 Esdras",            "NEH", "OT"),  # DR: 2 Esdras = Nehemiah
    ("Tobit",            "Tobit",          "Tobias",              "TOB", "OT"),
    ("Judith",           "Judith",         "Judith",              "JDT", "OT"),
    ("Esther",           "Esther",         "Esther",              "EST", "OT"),
    ("1 Maccabees",      "1Maccabees",     "1 Machabees",         "1MA", "OT"),
    ("2 Maccabees",      "2Maccabees",     "2 Machabees",         "2MA", "OT"),
    ("Job",              "Job",            "Job",                 "JOB", "OT"),
    ("Psalms",           "Psalms",         "Psalms",              "PSA", "OT"),
    ("Proverbs",         "Proverbs",       "Proverbs",            "PRO", "OT"),
    ("Ecclesiastes",     "Ecclesiastes",   "Ecclesiastes",        "ECC", "OT"),
    ("Song of Songs",    "SongofSongs",    "Canticles",           "SNG", "OT"),
    ("Wisdom",           "Wisdom",         "Wisdom",              "WIS", "OT"),
    ("Sirach",           "Sirach",         "Ecclesiasticus",      "SIR", "OT"),
    ("Isaiah",           "Isaiah",         "Isaias",              "ISA", "OT"),
    ("Jeremiah",         "Jeremiah",       "Jeremias",            "JER", "OT"),
    ("Lamentations",     "Lamentations",   "Lamentations",        "LAM", "OT"),
    ("Baruch",           "Baruch",         "Baruch",              "BAR", "OT"),
    ("Ezekiel",          "Ezekiel",        "Ezechiel",            "EZK", "OT"),
    ("Daniel",           "Daniel",         "Daniel",              "DAN", "OT"),
    ("Hosea",            "Hosea",          "Osee",                "HOS", "OT"),
    ("Joel",             "Joel",           "Joel",                "JOL", "OT"),
    ("Amos",             "Amos",           "Amos",                "AMO", "OT"),
    ("Obadiah",          "Obadiah",        "Abdias",              "OBA", "OT"),
    ("Jonah",            "Jonah",          "Jonas",               "JON", "OT"),
    ("Micah",            "Micah",          "Micheas",             "MIC", "OT"),
    ("Nahum",            "Nahum",          "Nahum",               "NAH", "OT"),
    ("Habakkuk",         "Habakkuk",       "Habacuc",             "HAB", "OT"),
    ("Zephaniah",        "Zephaniah",      "Sophonias",           "ZEP", "OT"),
    ("Haggai",           "Haggai",         "Aggeus",              "HAG", "OT"),
    ("Zechariah",        "Zechariah",      "Zacharias",           "ZEC", "OT"),
    ("Malachi",          "Malachi",        "Malachias",           "MAL", "OT"),
    # New Testament
    ("Matthew",          "Matthew",        "Matthew",             "MAT", "NT"),
    ("Mark",             "Mark",           "Mark",                "MRK", "NT"),
    ("Luke",             "Luke",           "Luke",                "LUK", "NT"),
    ("John",             "John",           "John",                "JHN", "NT"),
    ("Acts",             "Acts",           "Acts",                "ACT", "NT"),
    ("Romans",           "Romans",         "Romans",              "ROM", "NT"),
    ("1 Corinthians",    "1Corinthians",   "1 Corinthians",       "1CO", "NT"),
    ("2 Corinthians",    "2Corinthians",   "2 Corinthians",       "2CO", "NT"),
    ("Galatians",        "Galatians",      "Galatians",           "GAL", "NT"),
    ("Ephesians",        "Ephesians",      "Ephesians",           "EPH", "NT"),
    ("Philippians",      "Philippians",    "Philippians",         "PHP", "NT"),
    ("Colossians",       "Colossians",     "Colossians",          "COL", "NT"),
    ("1 Thessalonians",  "1Thessalonians", "1 Thessalonians",     "1TH", "NT"),
    ("2 Thessalonians",  "2Thessalonians", "2 Thessalonians",     "2TH", "NT"),
    ("1 Timothy",        "1Timothy",       "1 Timothy",           "1TI", "NT"),
    ("2 Timothy",        "2Timothy",       "2 Timothy",           "2TI", "NT"),
    ("Titus",            "Titus",          "Titus",               "TIT", "NT"),
    ("Philemon",         "Philemon",       "Philemon",            "PHM", "NT"),
    ("Hebrews",          "Hebrews",        "Hebrews",             "HEB", "NT"),
    ("James",            "James",          "James",               "JAS", "NT"),
    ("1 Peter",          "1Peter",         "1 Peter",             "1PE", "NT"),
    ("2 Peter",          "2Peter",         "2 Peter",             "2PE", "NT"),
    ("1 John",           "1John",          "1 John",              "1JN", "NT"),
    ("2 John",           "2John",          "2 John",              "2JN", "NT"),
    ("3 John",           "3John",          "3 John",              "3JN", "NT"),
    ("Jude",             "Jude",           "Jude",                "JUD", "NT"),
    ("Revelation",       "Revelation",     "Apocalypse",          "REV", "NT"),
]

VERSION_NAMES = {
    "NABRE": "NABRE",
    "DR":    "Douay-Rheims",
}

def fetch_json(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "iCFD-import/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return None

def parse_nabre(data, book_name, book_code):
    """NABRE: { book, chapters: [{ chapter, verses: [{ verse, text }] }] }"""
    rows = []
    for ch in data.get("chapters", []):
        c = ch["chapter"]
        for v in ch.get("verses", []):
            vnum = v["verse"]
            text = re.sub(r'\s+', ' ', v["text"]).strip()
            rows.append({
                "book": book_name,
                "book_code": book_code,
                "chapter": c,
                "verse_start": vnum,
                "verse_end": None,
                "reference": f"{book_name} {c}:{vnum}",
                "text": text,
                "version": "NABRE",
            })
    return rows

def parse_dr(data, book_name, book_code):
    """DR: { chapter_str: { verse_str: text } }"""
    rows = []
    for ch_str, verses in data.items():
        if not ch_str.isdigit():
            continue
        c = int(ch_str)
        for v_str, text in verses.items():
            if not v_str.isdigit():
                continue
            vnum = int(v_str)
            text = re.sub(r'\s+', ' ', text).strip()
            # Strip DR cross-reference markers like *
            text = text.replace('*', '')
            rows.append({
                "book": book_name,
                "book_code": book_code,
                "chapter": c,
                "verse_start": vnum,
                "verse_end": None,
                "reference": f"{book_name} {c}:{vnum}",
                "text": text,
                "version": "Douay-Rheims",
            })
    return rows

def upsert_batch(rows, retries=3):
    url = f"{SUPABASE_URL}/rest/v1/scripture_verses?on_conflict=reference,version"
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

def import_version(version):
    total_rows = []
    skipped = []

    for book_name, nabre_file, dr_file, book_code, _ in BOOKS:
        if version == "NABRE":
            if not nabre_file:
                skipped.append(book_name)
                continue
            url = f"{NABRE_BASE}/{urllib.parse.quote(nabre_file)}.json"
            data = fetch_json(url)
            if not data:
                print(f"  SKIP {book_name}: not found at {url}")
                skipped.append(book_name)
                continue
            rows = parse_nabre(data, book_name, book_code)
        else:  # DR
            if not dr_file:
                skipped.append(book_name)
                continue
            url = f"{DR_BASE}/{urllib.parse.quote(dr_file)}.json"
            data = fetch_json(url)
            if not data:
                print(f"  SKIP {book_name}: not found at {url}")
                skipped.append(book_name)
                continue
            rows = parse_dr(data, book_name, book_code)

        if rows:
            total_rows.extend(rows)
            print(f"  {book_name}: {len(rows)} verses")
        else:
            print(f"  {book_name}: 0 verses (check format)")

    print(f"\nUpserting {len(total_rows)} verses in batches...")
    batch_size = 200
    upserted = 0
    for i in range(0, len(total_rows), batch_size):
        batch = total_rows[i:i + batch_size]
        status, err = upsert_batch(batch)
        if err:
            print(f"  ERROR at row {i}: {status} — {err}")
            sys.exit(1)
        upserted += len(batch)
        if (i // batch_size) % 10 == 0:
            print(f"  {upserted}/{len(total_rows)} upserted...")

    print(f"\nDone. {upserted} verses upserted for {version}.")
    if skipped:
        print(f"Skipped {len(skipped)} books: {skipped}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", choices=["NABRE", "DR", "all"], default="all")
    args = parser.parse_args()

    versions = ["NABRE", "DR"] if args.version == "all" else [args.version]
    for v in versions:
        print(f"\n=== Importing {v} ===")
        import_version(v)

if __name__ == "__main__":
    main()
