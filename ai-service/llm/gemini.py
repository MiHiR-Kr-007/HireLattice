import json
import logging
from google import genai
from google.genai import types
from llm.base import BaseLLMProvider
from models.schemas import MatchReport

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GeminiProvider(BaseLLMProvider):
    def __init__(self):
        self.client = genai.Client()
        self.model_id = 'gemini-2.5-flash' 

    async def generate_match_report(self, jd_text: str, resume_text: str) -> MatchReport:
        prompt = f"""
        You are an expert technical recruiter system. Compare the following Resume to the Job Description.
        You must output EXACTLY a valid JSON object with the following schema:
        {{
            "fit_score": <int between 0 and 10>,
            "matched_skills": [<list of matching skill strings>],
            "missing_skills": [<list of crucial missing skill strings>],
            "summary": "<a one-sentence explanation of the score>"
        }}

        Job Description:
        {jd_text}

        Resume:
        {resume_text}
        """
        
        try:
            # sync client (.aio) to prevent blocking the FastAPI event loop
            response = await self.client.aio.models.generate_content(
                model=self.model_id,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2, # low temperature for more deterministic/analytical results
                )
            )
            
            data = json.loads(response.text)
            return MatchReport(**data)
            
        except Exception as e:
            logger.error(f"LLM Generation failed: {str(e)}")
            return MatchReport(
                fit_score=0,
                matched_skills=[],
                missing_skills=[],
                summary="SYSTEM ERROR: AI parsing failed. Manual HR review required."
            )