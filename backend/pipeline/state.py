from typing import TypedDict, List, Optional

class PipelineState(TypedDict):
    job_id: str
    user_id: str
    status: str  # pending | scraping | synthesizing | generating | monetizing | done | failed
    signals: List[dict]
    clusters: List[dict]
    idea_cards: List[dict]
    monetization_reports: List[dict]
    error: Optional[str]
