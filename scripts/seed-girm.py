#!/usr/bin/env python3
"""Seed girm_articles table from documents/girm.json."""

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


def get_section(article_num: int) -> str:
    if article_num <= 15:
        return "Preamble"
    elif article_num <= 26:
        return "Chapter I: Importance and Dignity of the Eucharistic Celebration"
    elif article_num <= 90:
        return "Chapter II: Structure, Elements, and Parts of the Mass"
    elif article_num <= 111:
        return "Chapter III: Duties and Ministries in the Mass"
    elif article_num <= 287:
        return "Chapter IV: Various Forms of Celebrating Mass"
    elif article_num <= 318:
        return "Chapter V: Arrangement and Furnishing of Churches for the Celebration of the Eucharist"
    elif article_num <= 351:
        return "Chapter VI: Requisites for the Celebration of Mass"
    elif article_num <= 367:
        return "Chapter VII: Choice of the Mass and Its Parts"
    elif article_num <= 385:
        return "Chapter VIII: Masses and Prayers for Various Circumstances and Needs"
    else:
        return "Chapter IX: Adaptations within the Competence of Bishops"


def make_summary(text: str, max_len: int = 220) -> str:
    first = text.split("\n")[0].strip()
    if len(first) <= max_len:
        return first
    return first[:max_len].rsplit(" ", 1)[0] + "…"


def escape_sql(s: str) -> str:
    return s.replace("'", "''")


def main() -> None:
    girm_path = DOCS_DIR / "girm.json"
    if not girm_path.exists():
        raise FileNotFoundError(f"Not found: {girm_path}")

    with open(girm_path, encoding="utf-8") as f:
        entries = json.load(f)

    print(f"Loaded {len(entries)} GIRM articles")

    batch_dir = Path(tempfile.mkdtemp(prefix="girm_batches_"))
    batch_size = 50
    batches = [entries[i : i + batch_size] for i in range(0, len(entries), batch_size)]

    for b_idx, batch in enumerate(batches):
        sql_path = batch_dir / f"batch_{b_idx:03d}.sql"
        rows = []
        for entry in batch:
            article_num = int(entry["id"])
            text = entry["text"]
            summary = make_summary(text)
            section = get_section(article_num)
            rows.append(
                f"({article_num}, 'en', '{escape_sql(text)}', '{escape_sql(summary)}', '{escape_sql(section)}')"
            )
        sql = (
            "INSERT INTO girm_articles (article, lang, text, summary, section)\nVALUES\n"
            + ",\n".join(rows)
            + "\nON CONFLICT (article, lang) DO UPDATE SET text=EXCLUDED.text, summary=EXCLUDED.summary, section=EXCLUDED.section;"
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

    print("GIRM seeding complete.")


if __name__ == "__main__":
    main()
