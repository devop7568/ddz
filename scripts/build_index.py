#!/usr/bin/env python3
"""Build a FAISS index for prompt/coding memory documents."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--input", default="data/memory_docs.jsonl")
    p.add_argument("--index_out", default="outputs/memory.index")
    p.add_argument("--meta_out", default="outputs/memory_meta.json")
    p.add_argument("--embed_model", default="sentence-transformers/all-MiniLM-L6-v2")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    docs = []
    with open(args.input, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            docs.append(json.loads(line))

    if not docs:
        raise ValueError("No documents found in memory_docs.jsonl")

    texts = [d.get("text", "") for d in docs]
    model = SentenceTransformer(args.embed_model)
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=True)
    embs = np.asarray(embeddings, dtype="float32")

    dim = embs.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embs)

    Path(args.index_out).parent.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, args.index_out)

    meta = [
        {
            "id": i,
            "title": d.get("title", f"doc_{i}"),
            "tags": d.get("tags", []),
            "text": d.get("text", ""),
        }
        for i, d in enumerate(docs)
    ]

    with open(args.meta_out, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    print(f"Indexed {len(meta)} documents -> {args.index_out}")


if __name__ == "__main__":
    main()
