# RocketMind Coach

RocketMind Coach is a fast, single-page web app designed as a universal Rocket League coaching dashboard.

## What it does

- Builds a personalized step-by-step route toward Champion.
- Organizes weekly practice split across mechanics, replay review, and ranked blocks.
- Adapts suggestions to rank, playlist, and your biggest weakness.
- Turns replay notes into a practical review SOP (standard operating procedure).

- Includes a left-side **Coach Chat** button that jumps to a live coaching chat panel for quick tips and answers.

- Includes quick coaching prompts for deeper AI-assisted analysis.

## Run locally

Since this is a static site, you can open `index.html` directly or run a simple local server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Qwen3 Option A scaffold (fine-tune + RAG)

This repo now also includes a starter scaffold for building a prompt/coding assistant on top of `Qwen/Qwen3-8B`:

- Training script: `scripts/train_qlora.py`
- Dataset validator: `scripts/validate_data.py`
- RAG index builder: `scripts/build_index.py`
- Chat app: `scripts/chat_app.py`
- Seed datasets: `data/train.jsonl`, `data/eval.jsonl`, `data/memory_docs.jsonl`

### Install dependencies

```bash
pip install -U transformers datasets peft trl bitsandbytes accelerate sentence-transformers faiss-cpu
```

### Validate data

```bash
python3 scripts/validate_data.py
```

### Train (QLoRA)

```bash
accelerate launch scripts/train_qlora.py \
  --model_name Qwen/Qwen3-8B \
  --train_file data/train.jsonl \
  --eval_file data/eval.jsonl \
  --output_dir outputs/qwen3_promptcraft_lora
```

### Build memory index

```bash
python3 scripts/build_index.py \
  --input data/memory_docs.jsonl \
  --index_out outputs/memory.index \
  --meta_out outputs/memory_meta.json
```

### Run chat with RAG

```bash
python3 scripts/chat_app.py \
  --base_model Qwen/Qwen3-8B \
  --adapter outputs/qwen3_promptcraft_lora \
  --index outputs/memory.index \
  --meta outputs/memory_meta.json
```
