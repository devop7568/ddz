#!/usr/bin/env python3
"""RAG chat app for Option A (Qwen3-8B + LoRA + FAISS memory)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import faiss
import numpy as np
import torch
from sentence_transformers import SentenceTransformer
from transformers import AutoModelForCausalLM, AutoTokenizer


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--base_model", default="Qwen/Qwen3-8B")
    p.add_argument("--adapter", default="outputs/qwen3_promptcraft_lora")
    p.add_argument("--index", default="outputs/memory.index")
    p.add_argument("--meta", default="outputs/memory_meta.json")
    p.add_argument("--embed_model", default="sentence-transformers/all-MiniLM-L6-v2")
    p.add_argument("--top_k", type=int, default=4)
    p.add_argument("--max_new_tokens", type=int, default=500)
    p.add_argument("--temperature", type=float, default=0.3)
    return p.parse_args()


def load_model(base_model: str, adapter_dir: str):
    tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        device_map="auto",
        torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        trust_remote_code=True,
        load_in_4bit=True,
    )

    adapter_path = Path(adapter_dir)
    if adapter_path.exists():
        from peft import PeftModel

        model = PeftModel.from_pretrained(model, adapter_dir)
        print(f"Loaded adapter: {adapter_dir}")
    else:
        print("Adapter not found; using base model only.")

    return tokenizer, model


def retrieve(query: str, embedder, index, meta, top_k: int):
    q_emb = embedder.encode([query], normalize_embeddings=True)
    q_emb = np.asarray(q_emb, dtype="float32")
    scores, ids = index.search(q_emb, top_k)

    hits = []
    for score, idx in zip(scores[0], ids[0]):
        if idx < 0:
            continue
        doc = meta[idx]
        hits.append({"score": float(score), "title": doc["title"], "text": doc["text"], "tags": doc.get("tags", [])})
    return hits


def build_prompt(user_query: str, hits: list[dict]) -> str:
    memory_block = "\n\n".join(
        [f"[Memory {i+1}] {h['title']} | tags={h['tags']}\n{h['text']}" for i, h in enumerate(hits)]
    )
    return (
        "You are PromptCraft Switchblade: elite prompt-engineering + coding copilot.\n"
        "Priorities: precision, clarity, safety, actionable steps, tested code.\n"
        "Use memory snippets when relevant, but avoid hallucinating facts.\n\n"
        f"Context memory:\n{memory_block}\n\n"
        f"User request:\n{user_query}\n\n"
        "Return:\n"
        "1) concise answer\n2) concrete implementation steps\n3) optional code block if needed\n"
    )


def generate(tokenizer, model, prompt: str, max_new_tokens: int, temperature: float) -> str:
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            do_sample=temperature > 0,
            top_p=0.9,
            eos_token_id=tokenizer.eos_token_id,
            pad_token_id=tokenizer.eos_token_id,
        )
    return tokenizer.decode(out[0], skip_special_tokens=True)


def main() -> None:
    args = parse_args()

    index = faiss.read_index(args.index)
    with open(args.meta, "r", encoding="utf-8") as f:
        meta = json.load(f)

    embedder = SentenceTransformer(args.embed_model)
    tokenizer, model = load_model(args.base_model, args.adapter)

    print("Ready. Type 'exit' to quit.")
    while True:
        q = input("\n> ").strip()
        if not q or q.lower() in {"exit", "quit"}:
            break

        hits = retrieve(q, embedder, index, meta, args.top_k)
        prompt = build_prompt(q, hits)
        full = generate(tokenizer, model, prompt, args.max_new_tokens, args.temperature)

        # Print only generation tail beyond prompt when possible
        if full.startswith(prompt):
            print("\n" + full[len(prompt):].strip())
        else:
            print("\n" + full)


if __name__ == "__main__":
    main()
