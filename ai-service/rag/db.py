import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.host = os.getenv("DB_HOST", "localhost")
        self.port = os.getenv("DB_PORT", "5432")
        self.user = os.getenv("DB_USER", "hireflow_user")
        self.password = os.getenv("DB_PASSWORD", "password")
        self.dbname = os.getenv("DB_NAME", "hireflow_db")

    def get_connection(self):
        try:
            conn = psycopg2.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                dbname=self.dbname
            )
            return conn
        except Exception as e:
            logger.error(f"Database connection failed: {str(e)}")
            raise e

    def init_db(self):
        conn = None
        try:
            conn = self.get_connection()
            conn.autocommit = True
            with conn.cursor() as cursor:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                logger.info("pgvector extension verified/created.")

            conn.autocommit = False
            with conn.cursor() as cursor:
                # Gemini text-embedding-004 model outputs vectors of dimension 768
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS job_embeddings (
                        id SERIAL PRIMARY KEY,
                        job_id VARCHAR(255) UNIQUE NOT NULL,
                        job_description TEXT NOT NULL,
                        embedding vector(768) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                
                # create an HNSW index to optimize vector similarity searches in production
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS job_embeddings_hnsw_idx 
                    ON job_embeddings USING hnsw (embedding vector_cosine_ops);
                """)
                
                conn.commit()
                logger.info("Database tables and HNSW vector indexes successfully initialized.")
                
        except Exception as e:
            if conn:
                conn.rollback()
            logger.critical(f"Failed to initialize database schema: {str(e)}")
        finally:
            if conn:
                conn.close()