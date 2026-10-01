import os
import logging
import asyncpg

logger = logging.getLogger(__name__)

class DatabaseManager:
    _pool = None

    def __init__(self):
        self.host = os.getenv("DB_HOST", "localhost")
        self.port = os.getenv("DB_PORT", "5432")
        self.user = os.getenv("DB_USER", "hirelattice_user")
        self.password = os.getenv("DB_PASSWORD", "password")
        self.dbname = os.getenv("DB_NAME", "hirelattice_db")

    async def get_pool(self):
        if self.__class__._pool is None:
            try:
                self.__class__._pool = await asyncpg.create_pool(
                    host=self.host,
                    port=self.port,
                    user=self.user,
                    password=self.password,
                    database=self.dbname,
                    min_size=1,
                    max_size=10
                )
            except Exception as e:
                logger.error(f"Database pool creation failed: {str(e)}")
                raise e
        return self.__class__._pool

    async def init_db(self):
        try:
            pool = await self.get_pool()
            async with pool.acquire() as conn:
                await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                logger.info("pgvector extension verified/created.")

                # Gemini text-embedding-004 model outputs vectors of dimension 768
                await conn.execute("""
                    CREATE TABLE IF NOT EXISTS job_embeddings (
                        id SERIAL PRIMARY KEY,
                        job_id VARCHAR(255) UNIQUE NOT NULL,
                        job_description TEXT NOT NULL,
                        embedding vector(768) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                
                # create an HNSW index to optimize vector similarity searches in production
                await conn.execute("""
                    CREATE INDEX IF NOT EXISTS job_embeddings_hnsw_idx 
                    ON job_embeddings USING hnsw (embedding vector_cosine_ops);
                """)
                
                logger.info("Database tables and HNSW vector indexes successfully initialized.")
                
        except Exception as e:
            logger.critical(f"Failed to initialize database schema: {str(e)}")
            raise e