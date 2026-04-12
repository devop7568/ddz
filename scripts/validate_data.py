#!/usr/bin/env python3
"""Validate training/eval JSONL schema and rough size split."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

REQUIRED = ["instruction", "response"]


def validate_jsonl(path: Path) -> tuple[int, list[str]]:
    errors = []
    count = 0
    with path.open("r", encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            count += 1
            try:
                obj = json.loads(line)
            except Exception as e:
                errors.append(f"{path}:{i} invalid JSON ({e})")
                continue
            for req in REQUIRED:
                if req not in obj or not str(obj.get(req, "")).strip():
                    errors.append(f"{path}:{i} missing/empty '{req}'")
    return count, errors


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--train", default="data/train.jsonl")
    p.add_argument("--eval", default="data/eval.jsonl")
    p.add_argument("--memory", default="data/memory_docs.jsonl")
    args = p.parse_args()

    train_path = Path(args.train)
    eval_path = Path(args.eval)
    mem_path = Path(args.memory)

    for path in [train_path, eval_path, mem_path]:
        if not path.exists():
            raise FileNotFoundError(f"Missing file: {path}")

    train_n, train_err = validate_jsonl(train_path)
    eval_n, eval_err = validate_jsonl(eval_path)

    # memory docs require text at minimum
    mem_err = []
    mem_n = 0
    with mem_path.open("r", encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            mem_n += 1
            obj = json.loads(line)
            if not str(obj.get("text", "")).strip():
                mem_err.append(f"{mem_path}:{i} missing/empty 'text'")

    all_err = train_err + eval_err + mem_err

    print(f"train rows:  {train_n}")
    print(f"eval rows:   {eval_n}")
    print(f"memory rows: {mem_n}")

    total_bytes = train_path.stat().st_size + eval_path.stat().st_size + mem_path.stat().st_size
    print(f"dataset size: {total_bytes / (1024*1024):.2f} MB")

    if all_err:
        print("\nErrors:")
        for e in all_err[:50]:
            print("-", e)
        raise SystemExit(1)

    print("\nValidation passed.")


if __name__ == "__main__":
    main()
