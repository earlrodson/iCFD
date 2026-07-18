#!/usr/bin/env python3
"""Seed canons table from documents/canon.json."""

import json
import os
import subprocess
import tempfile
from pathlib import Path

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

SCRIPT_DIR = Path(__file__).parent
DOCS_DIR = SCRIPT_DIR.parent / "documents"


def get_book(canon_num: int) -> str:
    if canon_num <= 203:
        return "Book I: General Norms"
    elif canon_num <= 746:
        return "Book II: The People of God"
    elif canon_num <= 833:
        return "Book III: The Teaching Office of the Church"
    elif canon_num <= 1253:
        return "Book IV: The Office of Sanctifying in the Church"
    elif canon_num <= 1310:
        return "Book V: The Temporal Goods of the Church"
    elif canon_num <= 1399:
        return "Book VI: Sanctions in the Church"
    else:
        return "Book VII: Processes"


def make_summary(text: str, max_len: int = 220) -> str:
    first = text.split("\n")[0].strip()
    if len(first) <= max_len:
        return first
    return first[:max_len].rsplit(" ", 1)[0] + "…"


def escape_sql(s: str) -> str:
    return s.replace("'", "''")


def main() -> None:
    canon_path = DOCS_DIR / "canon.json"
    if not canon_path.exists():
        raise FileNotFoundError(f"Not found: {canon_path}")

    with open(canon_path, encoding="utf-8") as f:
        entries = json.load(f)

    print(f"Loaded {len(entries)} canons")

    batch_dir = Path(tempfile.mkdtemp(prefix="canon_batches_"))
    batch_size = 50
    batches = [entries[i : i + batch_size] for i in range(0, len(entries), batch_size)]

    for b_idx, batch in enumerate(batches):
        sql_path = batch_dir / f"batch_{b_idx:03d}.sql"
        rows = []
        for entry in batch:
            canon_num = int(entry["id"])
            if "text" in entry:
                text = entry["text"]
            else:
                # canons with numbered paragraphs (§1, §2, …)
                sections = entry.get("sections", [])
                text = " ".join(
                    f"§{s['id']} {s['text'].strip()}" for s in sections
                )
            summary = make_summary(text)
            book = get_book(canon_num)
            rows.append(
                f"({canon_num}, 'en', '{escape_sql(text)}', '{escape_sql(summary)}', '{escape_sql(book)}')"
            )
        sql = (
            "INSERT INTO canons (canon, lang, text, summary, book)\nVALUES\n"
            + ",\n".join(rows)
            + "\nON CONFLICT (canon, lang) DO UPDATE SET text=EXCLUDED.text, summary=EXCLUDED.summary, book=EXCLUDED.book;"
        )
        sql_path.write_text(sql, encoding="utf-8")

    print(f"Generated {len(batches)} batch files in {batch_dir}")

    if not DATABASE_URL:
        raise EnvironmentError("DATABASE_URL is not set — cannot run psql")

    for b_idx in range(len(batches)):
        sql_path = batch_dir / f"batch_{b_idx:03d}.sql"
        result = subprocess.run(
            ["psql", DATABASE_URL, "-f", str(sql_path)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"ERROR on batch {b_idx:03d}:\n{result.stderr}")
            raise RuntimeError(f"psql failed on batch {b_idx:03d}")
        print(f"Batch {b_idx:03d}/{len(batches) - 1} done")

    print("Canon Law seeding complete.")


if __name__ == "__main__":
    main()
