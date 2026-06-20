"""Generate the dark-mode variant of the Security Estimator Pro logo."""
import asyncio
import base64
import os
from pathlib import Path

from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage


load_dotenv("/app/backend/.env")

OUT_DIR = Path("/app/frontend/assets/images")
OUT_DIR.mkdir(parents=True, exist_ok=True)


async def main() -> None:
    api_key = os.getenv("EMERGENT_LLM_KEY")
    assert api_key, "EMERGENT_LLM_KEY missing"

    chat = LlmChat(
        api_key=api_key,
        session_id="security-estimator-pro-logo-dark",
        system_message="You are a senior brand designer.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )

    prompt = (
        "Design the dark-mode app logo for 'Security Estimator Pro' as a perfect "
        "counterpart to the light version. Centered, symmetrical mark on a deep "
        "charcoal background (#1C1C1E). The mark is a minimalist sage-green "
        "(#8FB3A4) shield silhouette with a small geometric camera-lens / aperture "
        "detail inside it — a clean concentric circle with thin sage strokes. The "
        "sage tone should pop cleanly against the dark background while staying "
        "calm and professional. NO gradients, NO 3D, NO photorealism, NO bevels, "
        "NO text. Sharp vector-style edges, generous padding, balanced negative "
        "space. Square 1024x1024, app-icon ready, iOS-native dark-mode aesthetic, "
        "trustworthy B2B feel. Solid charcoal background only."
    )

    msg = UserMessage(text=prompt)
    text, images = await chat.send_message_multimodal_response(msg)
    print("Text reply (truncated):", (text or "")[:140])
    if not images:
        raise SystemExit("No image returned by model")

    img = images[0]
    print("Image mime:", img.get("mime_type"))
    data = base64.b64decode(img["data"])
    raw_path = OUT_DIR / "logo-dark.raw"
    with open(raw_path, "wb") as f:
        f.write(data)
    print("Saved raw:", raw_path, "bytes:", len(data))


if __name__ == "__main__":
    asyncio.run(main())
