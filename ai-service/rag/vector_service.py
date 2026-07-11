import logging
from pgvector.psycopg2 import register_vector
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

        conn = None
        try:
            conn = self.db_manager.get_connection()
            register_vector(conn) 
            
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO job_embeddings (job_id, job_description, embedding)
                    VALUES (%s, %s, %s::vector)
                    ON CONFLICT (job_id) 
                    DO UPDATE SET job_description = EXCLUDED.job_description, embedding = EXCLUDED.embedding;
                """, (job_id, job_description, embedding))
                conn.commit()
                logger.info(f"Successfully stored vector embeddings for Job ID: {job_id}")
                return True
                
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Failed to persist job embedding to database: {str(e)}")
            return False
        finally:
            if conn:
                conn.close()

    async def find_similar_jobs(self, resume_text: str, limit: int = 3):
        " a similarity search against stored JDs using cosine distance"
        embedding = await self.embedding_provider.get_embedding(resume_text)
        if not embedding:
            return []

        conn = None
        try:
            conn = self.db_manager.get_connection()
            register_vector(conn)
            
            with conn.cursor() as cursor:
                # calculate (1 - cosine_distance) to convert distance to a similarity percentage match
                cursor.execute("""
                    SELECT job_id, job_description, (1 - (embedding <=> %s::vector)) AS similarity_score
                    FROM job_embeddings
                    ORDER BY embedding <=> %s::vector
                    LIMIT %s;
                """, (embedding, embedding, limit))
                
                results = cursor.fetchall()
                return [
                    {"job_id": row[0], "job_description": row[1], "similarity": float(row[2])}
                    for row in results
                ]
        except Exception as e:
            logger.error(f"Semantic similarity search failed: {str(e)}")
            return []
        finally:
            if conn:
                conn.close()