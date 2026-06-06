from typing import TypedDict, Optional, Dict, Any

class ResumePipelineState(TypedDict):
    job_id: str
    user_id: str
    user_input: dict          # raw form data
    job_description: str      # optional JD paste
    template: str             # 'classic_ats' | 'modern_split' | 'tech_minimal' | 'creative_edge'
    color_theme: str
    draft_resume: Optional[Dict[str, Any]]
    humanized_resume: Optional[Dict[str, Any]]
    ai_score: Optional[float]
    ats_score: Optional[float]
    final_resume: Optional[Dict[str, Any]]
    pass2_attempts: int
    status: str               # pending | drafting | humanizing | scoring | ats | done | failed
    error: Optional[str]
