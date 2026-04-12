#!/usr/bin/env python3
"""QLoRA fine-tuning for Option A (Qwen3-8B + promptcraft/coding corpus)."""

from __future__ import annotations

import argparse

import torch
from datasets import load_dataset
from peft import LoraConfig
from transformers import AutoModelForCausalLM, AutoTokenizer
from trl import SFTConfig, SFTTrainer


def format_example(example: dict) -> str:
    instruction = (example.get("instruction") or "").strip()
    context = (example.get("context") or "").strip()
    response = (example.get("response") or "").strip()

    if context:
        return (
            f"### Instruction\n{instruction}\n\n"
            f"### Context\n{context}\n\n"
            f"### Response\n{response}"
        )
    return f"### Instruction\n{instruction}\n\n### Response\n{response}"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--model_name", default="Qwen/Qwen3-8B")
    p.add_argument("--train_file", default="data/train.jsonl")
    p.add_argument("--eval_file", default="data/eval.jsonl")
    p.add_argument("--output_dir", default="outputs/qwen3_promptcraft_lora")
    p.add_argument("--max_seq_length", type=int, default=2048)
    p.add_argument("--lr", type=float, default=2e-4)
    p.add_argument("--epochs", type=float, default=2.0)
    p.add_argument("--batch_size", type=int, default=2)
    p.add_argument("--grad_accum", type=int, default=8)
    p.add_argument("--warmup_ratio", type=float, default=0.03)
    p.add_argument("--logging_steps", type=int, default=10)
    p.add_argument("--save_steps", type=int, default=200)
    p.add_argument("--eval_steps", type=int, default=200)
    return p.parse_args()


def main() -> None:
    args = parse_args()

    tokenizer = AutoTokenizer.from_pretrained(args.model_name, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        args.model_name,
        torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
        device_map="auto",
        trust_remote_code=True,
        load_in_4bit=True,
    )

    train_ds = load_dataset("json", data_files=args.train_file, split="train")
    eval_ds = load_dataset("json", data_files=args.eval_file, split="train")

    train_ds = train_ds.map(lambda e: {"text": format_example(e)})
    eval_ds = eval_ds.map(lambda e: {"text": format_example(e)})

    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "up_proj", "down_proj", "gate_proj"],
        bias="none",
        task_type="CAUSAL_LM",
    )

    sft_config = SFTConfig(
        output_dir=args.output_dir,
        max_seq_length=args.max_seq_length,
        learning_rate=args.lr,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        warmup_ratio=args.warmup_ratio,
        logging_steps=args.logging_steps,
        save_steps=args.save_steps,
        eval_steps=args.eval_steps,
        evaluation_strategy="steps",
        save_strategy="steps",
        bf16=torch.cuda.is_available(),
        gradient_checkpointing=True,
        lr_scheduler_type="cosine",
        report_to="none",
    )

    trainer = SFTTrainer(
        model=model,
        train_dataset=train_ds,
        eval_dataset=eval_ds,
        processing_class=tokenizer,
        peft_config=peft_config,
        args=sft_config,
        dataset_text_field="text",
    )

    trainer.train()
    trainer.model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)


if __name__ == "__main__":
    main()
