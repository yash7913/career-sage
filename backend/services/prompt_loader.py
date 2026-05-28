from pathlib import Path

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

def load_prompt(filename: str, **kwargs) -> str:
    path = PROMPTS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Prompt not found: {filename}")
    return path.read_text(encoding="utf-8").format(**kwargs)