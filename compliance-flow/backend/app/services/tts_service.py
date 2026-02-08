"""Text-to-speech service using piper-tts (local, offline, CPU-friendly)."""

import asyncio
import io
import json
import wave
from pathlib import Path
from typing import Optional
from urllib.request import urlretrieve

from loguru import logger

# Piper voice model hosted on GitHub/Hugging Face
_VOICE_NAME = "en_US-lessac-medium"
_BASE_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/medium"
_ONNX_FILE = f"{_VOICE_NAME}.onnx"
_CONFIG_FILE = f"{_VOICE_NAME}.onnx.json"

DEFAULT_DATA_DIR = Path.home() / ".local" / "share" / "piper-voices"


class TTSService:
    """Lightweight TTS using piper-tts. Downloads voice model on first use."""

    def __init__(self, data_dir: Optional[str] = None):
        self._voice = None
        self._data_dir = Path(data_dir) if data_dir else DEFAULT_DATA_DIR
        self._lock = asyncio.Lock()
        logger.info(f"TTSService initialized (cache={self._data_dir})")

    async def _ensure_voice(self) -> None:
        """Lazy-load the piper voice model, downloading if needed."""
        async with self._lock:
            if self._voice is not None:
                return

            loop = asyncio.get_event_loop()
            self._voice = await loop.run_in_executor(None, self._load_voice)
            logger.info("Piper TTS voice loaded")

    def _download_model(self) -> tuple[Path, Path]:
        """Download ONNX voice model + config if not already cached."""
        self._data_dir.mkdir(parents=True, exist_ok=True)
        onnx_path = self._data_dir / _ONNX_FILE
        config_path = self._data_dir / _CONFIG_FILE

        if not onnx_path.exists():
            logger.info(f"Downloading Piper voice model: {_VOICE_NAME} ...")
            urlretrieve(f"{_BASE_URL}/{_ONNX_FILE}", str(onnx_path))
            logger.info(f"Downloaded {onnx_path.name} ({onnx_path.stat().st_size / 1e6:.1f} MB)")

        if not config_path.exists():
            urlretrieve(f"{_BASE_URL}/{_CONFIG_FILE}", str(config_path))
            logger.info(f"Downloaded {config_path.name}")

        return onnx_path, config_path

    def _load_voice(self):
        """Synchronous voice model load (runs in thread pool)."""
        try:
            from piper import PiperVoice
        except ImportError:
            logger.error("piper-tts not installed — TTS unavailable")
            raise RuntimeError("piper-tts package not installed")

        onnx_path, config_path = self._download_model()
        return PiperVoice.load(str(onnx_path), config_path=str(config_path))

    async def synthesize(self, text: str) -> bytes:
        """Convert text to WAV audio bytes.

        Args:
            text: The text to speak.

        Returns:
            Raw WAV file bytes (16-bit PCM).
        """
        if not text.strip():
            raise ValueError("Empty text")

        await self._ensure_voice()

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._synthesize_sync, text)

    def _synthesize_sync(self, text: str) -> bytes:
        """Run synthesis synchronously (thread pool)."""
        pcm_chunks: list[bytes] = []
        for chunk in self._voice.synthesize(text):
            pcm_chunks.append(chunk.audio_int16_bytes)

        pcm = b"".join(pcm_chunks)
        sample_rate = self._voice.config.sample_rate

        buf = io.BytesIO()
        with wave.open(buf, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(sample_rate)
            wf.writeframes(pcm)
        return buf.getvalue()

    async def close(self) -> None:
        """Release resources."""
        self._voice = None
        logger.info("TTSService closed")
