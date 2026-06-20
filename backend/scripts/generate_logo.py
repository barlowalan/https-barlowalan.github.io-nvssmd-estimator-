"""One-off script to generate the Security Estimator Pro logo using Gemini Nano Banana."""
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
        session_id="security-estimator-pro-logo",
        system_message="You are a senior brand designer.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(
        modalities=["image", "text"]
    )

    prompt = (
        "Design a clean, modern app logo for 'Security Estimator Pro', a mobile app for "
        "security-systems contractors who estimate CCTV, access control, and intrusion "
        "projects. Centered, symmetrical mark on a soft off-white background (#F9F9F7). "
        "The mark should be a minimalist sage-green (#5B7B6D) shield silhouette with a "
        "small geometric camera-lens / aperture detail inside it (a clean concentric "
        "circle with thin sage strokes — NO photo-realistic lens). Add subtle inner "
        "depth via flat tonal layering, NO heavy gradients, NO 3D, NO photorealism, "
        "NO bevels, NO text. Sharp vector-style edges, generous padding, balanced "
        "negative space. Square 1024x1024, app-icon ready, professional B2B feel, "
        "iOS-native aesthetic, calm and trustworthy. Single-color sage palette with "
        "white background only."
    )

    msg = UserMessage(text=prompt)
    text, images = await chat.send_message_multimodal_response(msg)
    print("Text reply (truncated):", (text or "")[:140])
    if not images:
        raise SystemExit("No image returned by model")

    img = images[0]
    print("Image mime:", img.get("mime_type"))
    data = base64.b64decode(img["data"])
    out_path = OUT_DIR / "logo.png"
    with open(out_path, "wb") as f:
        f.write(data)
    print("Saved:", out_path, "bytes:", len(data))


if __name__ == "__main__":
    asyncio.run(main())
