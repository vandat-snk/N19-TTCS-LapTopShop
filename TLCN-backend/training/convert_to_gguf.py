from unsloth import FastLanguageModel
from pathlib import Path

MODEL_DIR = str(Path(__file__).resolve().parent / "laptop-chatbot-qwen7b-merged")
OUTPUT_DIR = str(Path(__file__).resolve().parent / "laptop-chatbot-qwen7b")
QUANT_METHOD = "q4_k_m"

# Nạp mô hình gốc đã merge 16-bit
model, tokenizer = FastLanguageModel.from_pretrained(MODEL_DIR)

# Gọi hàm tích hợp của Unsloth để tự động nén và xuất file GGUF
model.save_pretrained_gguf(
    OUTPUT_DIR, 
    tokenizer, 
    quantization_method=QUANT_METHOD
)
