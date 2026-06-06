import os
import re
import math
import logging
import statistics

logger = logging.getLogger(__name__)

# List of forbidden words to evaluate density
DEFAULT_FORBIDDEN_WORDS = {
    "leverage", "utilize", "spearhead", "synergy", "robust", "cutting-edge", "seamlessly",
    "innovative", "dynamic", "passionate", "results-driven", "detail-oriented", "proactive",
    "strategic", "holistic", "paradigm", "ecosystem", "scalable", "best-in-class", "world-class",
    "transformative", "game-changer", "disruptive", "actionable", "impactful", "deliverables"
}

class ScoreChecker:
    def __init__(self):
        self.forbidden_words = DEFAULT_FORBIDDEN_WORDS
        self._load_forbidden_words()

    def _load_forbidden_words(self):
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            filepath = os.path.join(current_dir, "forbidden_words.txt")
            if os.path.exists(filepath):
                with open(filepath, "r") as f:
                    content = f.read()
                    words = re.split(r"[,\n]", content)
                    self.forbidden_words = {w.strip().lower() for w in words if w.strip()}
        except Exception as e:
            logger.warning(f"Could not load forbidden words in score checker: {e}. Using defaults.")

    def score(self, resume_data: dict) -> float:
        """
        Approximates GPTZero's perplexity + burstiness scoring.
        Returns a float between 0.0 and 1.0 (lower = more human).
        """
        # 1. Flatten resume content to search text
        text_parts = []
        text_parts.append(resume_data.get("summary", ""))
        
        for exp in resume_data.get("experience", []):
            text_parts.append(exp.get("company", ""))
            text_parts.append(exp.get("title", ""))
            text_parts.extend(exp.get("bullets", []))
            
        for edu in resume_data.get("education", []):
            text_parts.append(edu.get("institution", ""))
            text_parts.append(edu.get("degree", ""))
            
        skills = resume_data.get("skills", {})
        if isinstance(skills, dict):
            text_parts.extend(skills.get("technical", []))
            text_parts.extend(skills.get("soft", []))
            
        for proj in resume_data.get("projects", []):
            text_parts.append(proj.get("name", ""))
            text_parts.append(proj.get("description", ""))
            text_parts.extend(proj.get("tech_stack", []))
            
        full_text = " ".join([t for t in text_parts if t])
        
        if not full_text.strip():
            return 0.1 # default safe score
            
        # 2. Calculate heuristics
        perplexity = self._calculate_perplexity_approx(full_text)
        burstiness = self._calculate_burstiness_approx(full_text)
        forbidden_density = self._check_forbidden_words_density(full_text)
        
        # 3. Normalize values
        # Perplexity norm (higher is better for human, typical values 10-150)
        norm_perp = min(1.0, perplexity / 100.0)
        
        # Burstiness norm (sentence length variance, higher is better, typical stdev 2-15)
        norm_burst = min(1.0, burstiness / 12.0)
        
        # 4. Composite weighted score (lower score = more human-written)
        # We want:
        # High perplexity -> human -> lowers score
        # High burstiness -> human -> lowers score
        # High forbidden words -> AI -> increases score
        
        ai_score = (
            0.4 * (1.0 - norm_perp) +
            0.4 * (1.0 - norm_burst) +
            0.2 * forbidden_density
        )
        
        # Clamp between 0.02 (2%) and 0.98 (98%)
        final_score = max(0.02, min(0.98, ai_score))
        return round(final_score, 3)

    def _split_sentences(self, text: str) -> list[str]:
        """Safely splits text into sentences without failing if NLTK punkt is missing."""
        try:
            import nltk
            try:
                # Silently verify punkt is downloaded
                nltk.data.find('tokenizers/punkt')
            except LookupError:
                # Download if not present
                nltk.download('punkt', quiet=True)
                nltk.download('punkt_tab', quiet=True)
            from nltk.tokenize import sent_tokenize
            return sent_tokenize(text)
        except Exception:
            # Safe fallback splitting using regex
            sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s', text)
            return [s.strip() for s in sentences if s.strip()]

    def _calculate_perplexity_approx(self, text: str) -> float:
        """
        Approximates lexical perplexity. 
        Measures vocabulary diversity and word length entropy.
        """
        words = [w.lower() for w in re.findall(r'\b\w+\b', text)]
        if not words:
            return 1.0
            
        unique_ratio = len(set(words)) / len(words)
        
        # Calculate word length distribution entropy
        lengths = [len(w) for w in words]
        length_counts = {}
        for l in lengths:
            length_counts[l] = length_counts.get(l, 0) + 1
            
        entropy = 0.0
        total = len(words)
        for count in length_counts.values():
            p = count / total
            entropy -= p * math.log2(p)
            
        # Perplexity approximation: combine unique ratio and word length entropy
        approx = (unique_ratio * 40.0) + (entropy * 15.0)
        return approx

    def _calculate_burstiness_approx(self, text: str) -> float:
        """Variance in sentence length. High variance = human-like."""
        sentences = self._split_sentences(text)
        if len(sentences) <= 1:
            return 0.0
            
        lengths = [len(s.split()) for s in sentences]
        try:
            return statistics.stdev(lengths)
        except Exception:
            return 0.0

    def _check_forbidden_words_density(self, text: str) -> float:
        """Density of LLM-signature words. Lower = more human."""
        words = [w.lower() for w in re.findall(r'\b\w+\b', text)]
        if not words:
            return 0.0
            
        hits = sum(1 for w in words if w in self.forbidden_words)
        # Return percentage density, normalized so that 5% density = 1.0 score impact
        density = hits / len(words)
        return min(1.0, density / 0.05)
