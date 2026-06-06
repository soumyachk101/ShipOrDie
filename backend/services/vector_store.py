import logging
import chromadb
from chromadb.config import Settings as ChromaSettings
from backend.config import settings

logger = logging.getLogger(__name__)

class VectorStore:
    def __init__(self):
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        try:
            logger.info(f"Connecting to ChromaDB at {settings.CHROMA_HOST}:{settings.CHROMA_PORT}...")
            # Try to connect to host/port
            self.client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            # Ping to verify active connection
            self.client.heartbeat()
            logger.info("Successfully connected to ChromaDB HTTP Server.")
        except Exception as e:
            logger.warning(f"Could not connect to ChromaDB server ({e}). Falling back to local PersistentClient.")
            try:
                self.client = chromadb.PersistentClient(
                    path="./chroma_data",
                    settings=ChromaSettings(anonymized_telemetry=False)
                )
                logger.info("ChromaDB PersistentClient initialized locally at ./chroma_data")
            except Exception as ex:
                logger.error(f"Failed to initialize local ChromaDB: {ex}. Falling back to EphemeralClient.")
                self.client = chromadb.EphemeralClient(
                    settings=ChromaSettings(anonymized_telemetry=False)
                )

    def get_or_create_collection(self, name: str):
        """Retrieves or creates a named collection in ChromaDB."""
        try:
            return self.client.get_or_create_collection(name=name)
        except Exception as e:
            logger.error(f"Error fetching collection {name}: {e}")
            raise

    def add_signals(self, collection_name: str, documents: list[str], metadatas: list[dict], ids: list[str]):
        """Adds signal documents to the collection."""
        try:
            collection = self.get_or_create_collection(collection_name)
            collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"Added {len(documents)} documents to ChromaDB collection {collection_name}")
        except Exception as e:
            logger.error(f"Failed to add signals to ChromaDB: {e}")

    def query_signals(self, collection_name: str, query_text: str, n_results: int = 10) -> dict:
        """Queries the vector store collection for semantically similar documents."""
        try:
            collection = self.get_or_create_collection(collection_name)
            results = collection.query(
                query_texts=[query_text],
                n_results=n_results
            )
            return results
        except Exception as e:
            logger.error(f"Failed to query ChromaDB: {e}")
            return {"documents": [[]], "metadatas": [[]], "ids": [[]], "distances": [[]]}

vector_store = VectorStore()
