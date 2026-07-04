from abc import ABC, abstractmethod
from models.schemas import MatchReport

class BaseLLMProvider(ABC):
    # base class for all LLM providers. 
    
    @abstractmethod
    async def generate_match_report(self, jd_text: str, resume_text: str) -> MatchReport:
        pass