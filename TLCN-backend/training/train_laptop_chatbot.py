import torch
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments
from pathlib import Path
import json
import datasets
from datasets import Dataset

MODEL_NAME = "unsloth/Qwen2.5-7B-Instruct-bnb-4bit"
MAX_SEQ_LENGTH = 1024
LORA_R = 16
LORA_ALPHA = 16
BATCH_SIZE = 1
GRAD_ACCUM = 8
LEARNING_RATE = 5e-5
EPOCHS = 1
OUTPUT_DIR = str(Path(__file__).resolve().parent / "laptop-chatbot-qwen7b")

# Sử dụng 2 tập Train và Val mới
TRAIN_FILE = str(Path(__file__).resolve().parent / "train.jsonl")
VAL_FILE = str(Path(__file__).resolve().parent / "val.jsonl")

print("-" * 60)
print("TIẾN TRÌNH HUẤN LUYỆN QWEN 2.5 7B CHO LAPTOP SHOP CHATBOT")
print("-" * 60)
print(f"Mô hình nền: {MODEL_NAME}")
print(f"VRAM của GPU: {torch.cuda.get_device_properties(0).total_memory/1e9:.1f}GB")
print(f"Tham số: max_seq_length={MAX_SEQ_LENGTH}, batch={BATCH_SIZE}, grad_accum={GRAD_ACCUM}")
print(f"Tập Train: {TRAIN_FILE}")
print(f"Tập Val: {VAL_FILE}")
print(f"Thư mục lưu trữ: {OUTPUT_DIR}")

print("\nĐang tiến hành tải mô hình nền...")
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,
    load_in_4bit=True,
)
print(f"   Đã tải mô hình thành công. VRAM đang sử dụng: {torch.cuda.memory_allocated()/1e9:.2f}GB")

print("\nĐang thiết lập cấu hình tham số LoRA...")
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_R,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_alpha=LORA_ALPHA,
    lora_dropout=0.1,
    bias="none",
    use_gradient_checkpointing="unsloth",
)
print(f"   Đã cấu hình LoRA thành công. VRAM đang sử dụng: {torch.cuda.memory_allocated()/1e9:.2f}GB")

datasets.arrow_dataset.generate_fingerprint = lambda *args, **kwargs: "dummy_fingerprint_123"

def prepare_dataset(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        raw_data = [json.loads(line) for line in f]
    
    formatted_data = []
    for item in raw_data:
        # Áp dụng template của Qwen2.5 cho từng tin nhắn trong hội thoại
        text = tokenizer.apply_chat_template(item["messages"], tokenize=False, add_generation_prompt=False)
        formatted_data.append({"text": text})
    return Dataset.from_list(formatted_data)

print("\nĐang tiến hành nạp và chuẩn hóa tập dữ liệu...")
train_dataset = prepare_dataset(TRAIN_FILE)
val_dataset = prepare_dataset(VAL_FILE)
print(f"   Tập Train: {len(train_dataset)} mẫu.")
print(f"   Tập Val: {len(val_dataset)} mẫu.")

print(f"\nBắt đầu thực hiện quá trình huấn luyện ({EPOCHS} epoch)...")

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_dataset,
    eval_dataset=val_dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    args=TrainingArguments(
        per_device_train_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUM,
        warmup_steps=10,
        num_train_epochs=EPOCHS,
        learning_rate=LEARNING_RATE,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=10,
        eval_strategy="steps",
        eval_steps=50,      # Đánh giá trên tập validation mỗi 50 bước
        save_steps=200,     # Lưu checkpoint mỗi 200 bước
        output_dir=OUTPUT_DIR,
        optim="adamw_8bit",
        seed=42,
        report_to="none",
    ),
)

print(f"Thông số VRAM trước khi train - Allocated: {torch.cuda.memory_allocated()/1e9:.2f}GB")
print(f"Thông số VRAM trước khi train - Reserved:  {torch.cuda.memory_reserved()/1e9:.2f}GB")
print()

trainer.train()

merged_dir = f"{OUTPUT_DIR}-merged"
print(f"\nĐang tiến hành lưu mô hình hoàn chỉnh (merged) vào {merged_dir}...")
model.save_pretrained_merged(
    merged_dir,
    tokenizer,
    save_method="merged_16bit"
)
print(f"   Mô hình hoàn chỉnh đã được lưu thành công tại thư mục: {merged_dir}/")
