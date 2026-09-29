import os
import io
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from app.core.config import settings
from app.core.logging import logger
from app.services.gemini_copilot_v2 import GeminiCopilotV2

class VoiceCommandService:
    """
    Google Cloud Speech-to-Text & Text-to-Speech Voice Command Center (Sections 33 & 34).
    Supported Indian Languages:
      hi-IN (Hindi), bn-IN (Bengali), te-IN (Telugu), ta-IN (Tamil),
      or-IN (Odia), gu-IN (Gujarati), kn-IN (Kannada), en-IN (Indian English).
    Rules:
      - Never inject fake transcripts behind user's back.
      - User controls language selection.
      - Explicit demo commands require explicit demo mode flag.
    """

    SUPPORTED_LANGUAGES = {
        "en-IN": {"name": "English (India)", "tts_voice": "en-IN-Neural2-A"},
        "hi-IN": {"name": "Hindi (हिंदी)", "tts_voice": "hi-IN-Neural2-A"},
        "bn-IN": {"name": "Bengali (বাংলা)", "tts_voice": "bn-IN-Neural2-A"},
        "te-IN": {"name": "Telugu (తెలుగు)", "tts_voice": "te-IN-Standard-A"},
        "ta-IN": {"name": "Tamil (தமிழ்)", "tts_voice": "ta-IN-Standard-A"},
        "or-IN": {"name": "Odia (ଓଡ଼ିଆ)", "tts_voice": "or-IN-Standard-A"},
        "gu-IN": {"name": "Gujarati (ગુજરાતી)", "tts_voice": "gu-IN-Standard-A"},
        "kn-IN": {"name": "Kannada (ಕನ್ನಡ)", "tts_voice": "kn-IN-Standard-A"},
        "en-US": {"name": "English (US)", "tts_voice": "en-US-Neural2-F"}
    }

    def __init__(self):
        self.enabled = settings.SPEECH_ENABLED
        self.project = settings.GOOGLE_CLOUD_PROJECT

    def is_speech_configured(self) -> bool:
        return bool(self.enabled and self.project)

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        language_code: str = "en-IN"
    ) -> Tuple[Optional[str], str]:
        """
        Transcribes incoming audio stream via Google Cloud Speech-to-Text.
        Returns: (transcript, provider_status)
        Never fabricates user speech.
        """
        if not audio_bytes:
            return None, "NO_AUDIO_DATA"

        lang = language_code if language_code in self.SUPPORTED_LANGUAGES else "en-IN"

        if self.is_speech_configured():
            try:
                from google.cloud import speech
                client = speech.SpeechClient()
                audio = speech.RecognitionAudio(content=audio_bytes)
                config = speech.RecognitionConfig(
                    encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                    sample_rate_hertz=sample_rate,
                    language_code=lang
                )
                response = client.recognize(config=config, audio=audio)
                if response.results and len(response.results) > 0:
                    transcript = response.results[0].alternatives[0].transcript
                    return transcript, "GOOGLE_CLOUD_SPEECH_TO_TEXT"
                return None, "NO_SPEECH_DETECTED"
            except Exception as e:
                logger.warning(f"Google Speech-to-Text invocation error: {str(e)}")
                return None, f"SPEECH_API_ERROR: {str(e)}"

        return None, "VOICE_SERVICE_NOT_CONFIGURED"

    async def synthesize_speech(
        self,
        text: str,
        language_code: str = "en-IN"
    ) -> Tuple[bytes, str]:
        """
        Synthesizes response text to audio via Google Cloud Text-to-Speech.
        Returns: (audio_bytes, provider_status)
        """
        if not text:
            return b"", "EMPTY_TEXT"

        lang = language_code if language_code in self.SUPPORTED_LANGUAGES else "en-IN"
        voice_name = self.SUPPORTED_LANGUAGES[lang]["tts_voice"]

        if self.is_speech_configured():
            try:
                from google.cloud import texttospeech
                client = texttospeech.TextToSpeechClient()
                s_input = texttospeech.SynthesisInput(text=text)
                voice = texttospeech.VoiceSelectionParams(
                    language_code=lang,
                    name=voice_name,
                    ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL
                )
                audio_config = texttospeech.AudioConfig(
                    audio_encoding=texttospeech.AudioEncoding.MP3
                )
                resp = client.synthesize_speech(input=s_input, voice=voice, audio_config=audio_config)
                return resp.audio_content, "GOOGLE_CLOUD_TEXT_TO_SPEECH"
            except Exception as e:
                logger.warning(f"Google Text-to-Speech invocation error: {str(e)}")
                return b"", f"TTS_API_ERROR: {str(e)}"

        return b"", "TTS_NOT_CONFIGURED"

    async def handle_voice_query(
        self,
        audio_bytes: Optional[bytes] = None,
        transcript: Optional[str] = None,
        language_code: str = "en-IN",
        is_demo: bool = False,
        demo_command: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Full pipeline: Audio / Explicit Demo -> Gemini Tool Routing -> Text Response -> TTS.
        Never injects fake transcript unless explicitly triggered via demo command button.
        """
        actual_transcript: Optional[str] = None
        source_provider = "UNRESOLVED"

        if transcript and transcript.strip():
            actual_transcript = transcript.strip()
            source_provider = "OPERATOR_TEXT_OR_BROWSER_SPEECH"
        elif audio_bytes and len(audio_bytes) > 0:
            actual_transcript, source_provider = await self.transcribe_audio(
                audio_bytes=audio_bytes,
                language_code=language_code
            )
            if not actual_transcript:
                return {
                    "success": False,
                    "error": "Could not transcribe audio input.",
                    "provider_status": source_provider,
                    "message": "VOICE SERVICE NOT CONFIGURED or no speech recognized."
                }
        elif is_demo and demo_command:
            actual_transcript = demo_command
            source_provider = "EXPLICIT DEMO COMMAND"
        else:
            return {
                "success": False,
                "error": "No user speech provided.",
                "provider_status": "VOICE SERVICE NOT CONFIGURED",
                "message": "VOICE SERVICE NOT CONFIGURED. Provide actual audio or click TRY DEMO VOICE COMMAND."
            }

        # Route query through Gemini Copilot tool routing
        copilot_res = GeminiCopilotV2.process_voice_command(actual_transcript)
        response_text = copilot_res.get("speech_text") or copilot_res.get("text") or "No explanation generated."

        # Optionally synthesize response speech in target Indian language
        audio_bytes_resp, tts_provider = await self.synthesize_speech(
            text=response_text,
            language_code=language_code
        )

        copilot_res["voice_metadata"] = {
            "input_transcript": actual_transcript,
            "input_source": source_provider,
            "language_code": language_code,
            "language_name": self.SUPPORTED_LANGUAGES.get(language_code, {}).get("name", "English (India)"),
            "tts_provider": tts_provider,
            "has_audio_response": len(audio_bytes_resp) > 0,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }

        return copilot_res
