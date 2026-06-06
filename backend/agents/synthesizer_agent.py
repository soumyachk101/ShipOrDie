import logging
import uuid
from backend.services.vector_store import vector_store

logger = logging.getLogger(__name__)

class SynthesizerAgent:
    def __init__(self):
        self.collection_name = "market_signals"

    async def run(self, signals: list[dict]) -> list[dict]:
        """
        Takes raw signals list, embeds and upserts them to ChromaDB, 
        and groups them into semantic opportunity clusters.
        """
        logger.info(f"Synthesizer Agent starting with {len(signals)} signals...")
        if not signals:
            return []
            
        # 1. Prepare data for ChromaDB upsert
        documents = []
        metadatas = []
        ids = []
        
        for idx, sig in enumerate(signals):
            doc_id = f"sig_{idx}_{uuid.uuid4().hex[:6]}"
            documents.append(sig["text"])
            metadatas.append({
                "source": sig["source"],
                "url": sig["url"],
                "upvotes": sig["upvotes"],
                "timestamp": sig["timestamp"]
            })
            ids.append(doc_id)
            
        # 2. Add to ChromaDB vector store
        try:
            vector_store.add_signals(
                collection_name=self.collection_name,
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
        except Exception as e:
            logger.error(f"Error adding to vector store: {e}. Proceeding with in-memory clustering.")
            
        # 3. Form clusters based on semantic query grouping
        # We query Chroma for each document to see its neighbors and cluster them
        clusters = []
        seen_ids = set()
        
        for i, doc_id in enumerate(ids):
            if doc_id in seen_ids:
                continue
                
            doc_text = documents[i]
            # Query vector store for close matches
            try:
                results = vector_store.query_signals(
                    collection_name=self.collection_name,
                    query_text=doc_text,
                    n_results=5
                )
                
                # Check results structures
                matching_ids = results.get("ids", [[]])[0]
                distances = results.get("distances", [[]])[0] if results.get("distances") else [0.0] * len(matching_ids)
                matching_docs = results.get("documents", [[]])[0]
                matching_metadatas = results.get("metadatas", [[]])[0]
                
                cluster_signals = []
                for idx_m, match_id in enumerate(matching_ids):
                    # We establish a distance threshold (closer than 1.0 depending on distance metric, 
                    # standard cosine distance is 0 to 2, where 0 is identical and 2 is opposite.
                    # distance < 0.6 indicates strong semantic similarity)
                    dist = distances[idx_m] if idx_m < len(distances) else 0.5
                    if dist < 0.8: # threshold
                        if match_id in ids:
                            sig_idx = ids.index(match_id)
                            orig_sig = signals[sig_idx]
                            cluster_signals.append(orig_sig)
                            seen_ids.add(match_id)
                            
                if cluster_signals:
                    # Formulate theme from first signal (representative)
                    repr_text = cluster_signals[0]["text"]
                    words = repr_text.split()
                    theme_words = [w.strip(".,!?:;()\"'") for w in words if len(w) > 4][:5]
                    theme_label = " ".join(theme_words).title() if theme_words else "Niche Opportunity"
                    
                    clusters.append({
                        "cluster_id": f"cluster_{uuid.uuid4().hex[:6]}",
                        "theme": theme_label,
                        "signals": cluster_signals
                    })
            except Exception as e:
                logger.error(f"Error during query/clustering for signal {doc_id}: {e}")
                # Simple fallback: create single-signal cluster
                seen_ids.add(doc_id)
                clusters.append({
                    "cluster_id": f"cluster_{uuid.uuid4().hex[:6]}",
                    "theme": f"Signal Theme {i}",
                    "signals": [signals[i]]
                })
                
        logger.info(f"Synthesizer Agent completed. Formed {len(clusters)} opportunity clusters.")
        return clusters
