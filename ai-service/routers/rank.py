from fastapi import APIRouter, HTTPException
from models.schemas import RankRequest, MatchReport
from llm.gemini import GeminiProvider
from rag.vector_service import VectorService
from pydantic import BaseModel

router = APIRouter(prefix="/api/ai", tags=["Ranking & Vector Operations"])

# initialize the provider
llm = GeminiProvider()
vector_service = VectorService()

class JobIngestRequest(BaseModel):
    job_id: str
    job_description: str

class SemanticSearchRequest(BaseModel):
    resume_text: str

@router.post("/rank", response_model=MatchReport)
async def rank_candidate(request: RankRequest):
    # Takes a JD and a Resume, compares them, and returns a structured match report
    report = await llm.generate_match_report(
        jd_text=request.job_description,
        resume_text=request.resume_text
    )
    return report

@router.post("/jobs", status_code=201)
async def ingest_job(request: JobIngestRequest):
    # called by the Node.js backend when an HR manager posts a new job.
    # generates an embedding and stores it in pgvector.
    success = await vector_service.store_job_embedding(
        job_id=request.job_id,
        job_description=request.job_description
    )
    
    if not success:
        raise HTTPException(
            status_code=500, 
            detail="Failed to generate or store job embedding. Check system logs."
        )
        
    return {"message": f"Job {request.job_id} embedded and stored successfully."}

@router.post("/jobs/search")
async def semantic_job_search(request: SemanticSearchRequest):
    # Takes a candidate's resume and returns the top 3 job descriptions that match semantically, ordered by similarity.
    matches = await vector_service.find_similar_jobs(
        resume_text=request.resume_text,
        limit=3
    )
    return {"matches": matches}