from pydantic import BaseModel, Field
from typing import List

class RankRequest(BaseModel):
    job_description: str = Field(..., description="The full text of the job description")
    resume_text: str = Field(..., description="The parsed text of the candidate's resume")

class MatchReport(BaseModel):
    fit_score: int = Field(..., ge=0, le=10, description="Overall fit score from 0 to 10")
    matched_skills: List[str] = Field(default_factory=list, description="Skills present in both JD and resume")
    missing_skills: List[str] = Field(default_factory=list, description="Crucial skills in JD missing from resume")
    summary: str = Field(..., description="A one-line explainable summary of the match")