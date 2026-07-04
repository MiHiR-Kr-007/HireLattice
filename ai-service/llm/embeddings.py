from abc import ABC, abstractmethod
from typing import List
from google import genai
import logging

logger = logging.getLogger(__name__)

class BaseEmbeddingProvider(ABC):
    # base class for converting text into vector arrays
    
    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        pass

class GeminiEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self):
        self.client = genai.Client()
        self.model_id = "text-embedding-004"

    async def get_embedding(self, text: str) -> List[float]:
        try:
            response = await self.client.aio.models.embed_content(
                model=self.model_id,
                contents=text
            )
            return response.embeddings[0].values
            
        except Exception as e:
            logger.error(f"Embedding generation failed: {str(e)}")
            return []