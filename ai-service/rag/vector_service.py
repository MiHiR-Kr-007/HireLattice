import logging
from pgvector.asyncpg import register_vector
from rag.db import DatabaseManager
from llm.embeddings import GeminiEmbeddingProvider

logger = logging.getLogger(__name__)

class VectorService:
    def __init__(self):
        self.db_manager = DatabaseManager()
        self.embedding_provider = GeminiEmbeddingProvider()

    async def store_job_embedding(self, job_id: str, job_description: str) -> bool:
        # Generates embedding for a JD and saves it to pgvector
        embedding = await self.embedding_provider.get_embedding(job_description)
        if not embedding:
            logger.error(f"Could not store job {job_id} because embedding generation failed.")
            return False

        try:
            pool = await self.db_manager.get_pool()
            async with pool.acquire() as conn:
                await register_vector(conn)
                
                await conn.execute("""
                    INSERT INTO job_embeddings (job_id, job_description, embedding)
                    VALUES ($1, $2, $3::vector)
                    ON CONFLICT (job_id) 
                    DO UPDATE SET job_description = EXCLUDED.job_description, embedding = EXCLUDED.embedding;
                """, job_id, job_description, embedding)
                logger.info(f"Successfully stored vector embeddings for Job ID: {job_id}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to persist job embedding to database: {str(e)}")
            return False

    async def find_similar_jobs(self, resume_text: str, limit: int = 3):
        " a similarity search against stored JDs using cosine distance"
        embedding = await self.embedding_provider.get_embedding(resume_text)
        if not embedding:
            return []

        try:
            pool = await self.db_manager.get_pool()
            async with pool.acquire() as conn:
                await register_vector(conn)
                
                # calculate (1 - cosine_distance) to convert distance to a similarity percentage match
                results = await conn.fetch("""
                    SELECT job_id, job_description, (1 - (embedding <=> $1::vector)) AS similarity_score
                    FROM job_embeddings
                    ORDER BY embedding <=> $1::vector
                    LIMIT $2;
                """, embedding, limit)
                
                return [
                    {"job_id": row['job_id'], "job_description": row['job_description'], "similarity": float(row['similarity_score'])}
                    for row in results
                ]
        except Exception as e:
            logger.error(f"Semantic similarity search failed: {str(e)}")
            return []