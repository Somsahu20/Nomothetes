import logging
import json
from typing import Optional, Dict, Any
from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure Gemini client
client = genai.Client(api_key=settings.GEMINI_API_KEY)


class GeminiAnalysisService:
    """Service for AI-powered legal document analysis using Google Gemini."""

    def __init__(self):
        self.model_name = "gemini-2.5-flash"

    def _call_gemini(self, prompt: str, max_tokens: int = 4096) -> Optional[str]:
        """Make a call to Gemini API."""
        try:
            response = client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={
                    "temperature": 0.3,
                    "max_output_tokens": max_tokens,
                }
            )

            if not response or not response.text:
                logger.warning("Empty response from Gemini")
                return None

            return response.text.strip()

        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            return None

    def generate_summary(self, text: str) -> Optional[str]:
        """Generate a comprehensive summary of the legal document."""
        if not text or len(text.strip()) < 100:
            return None

        # Limit text for API
        max_chars = 50000
        if len(text) > max_chars:
            text = text[:max_chars]

        prompt = f"""You are an expert legal analyst specializing in Indian law.

Analyze the following legal document and provide a comprehensive summary.Remember that mention the appropriate section number wherever possible as it will be important for the summary.

Your summary should include:
1. **Case Overview**: Brief description of what this case is about
2. **Parties Involved**: Who are the petitioners/plaintiffs and respondents/defendants
3. **Key Issues**: What are the main legal questions or disputes. Mention the section numbers as it is important.
4. **Facts**: Important factual background
5. **Arguments**: Key arguments made by each side
6. **Decision/Outcome**: What was decided (if this is a judgment)
7. **Legal Significance**: Why this case matters

Format your response in clear sections with headers.

LEGAL DOCUMENT:
\"\"\"
{text}
\"\"\"

Provide a detailed but concise summary:"""

        return self._call_gemini(prompt)

    def analyze_sentiment(self, text: str) -> Optional[Dict[str, Any]]:
        """Analyze the sentiment and tone of the legal document."""
        if not text or len(text.strip()) < 100:
            return None

        max_chars = 30000
        if len(text) > max_chars:
            text = text[:max_chars]

        prompt = f"""You are an expert legal analyst.

Analyze the sentiment and tone of this legal document and provide your analysis in JSON format.

Assess:
1. Overall tone (formal, adversarial, conciliatory, neutral)
2. Emotional indicators in language
3. Strength of arguments presented
4. Level of hostility or cooperation between parties
5. Judge's disposition (if this is a judgment)

Return ONLY a valid JSON object with this structure:
{{
  "overall_sentiment": "positive|negative|neutral|mixed",
  "tone": "formal|adversarial|conciliatory|neutral|critical",
  "confidence_level": "high|medium|low",
  "key_observations": [
    "observation 1",
    "observation 2",
    "observation 3"
  ],
  "party_sentiments": {{
    "petitioner": "aggressive|defensive|cooperative|neutral",
    "respondent": "aggressive|defensive|cooperative|neutral"
  }},
  "judicial_tone": "sympathetic|critical|neutral|balanced",
  "summary": "Brief 2-3 sentence summary of the overall sentiment"
}}

LEGAL DOCUMENT:
\"\"\"
{text}
\"\"\"

JSON Response:"""

        response = self._call_gemini(prompt)
        if not response:
            return None

        try:
            # Clean response
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            return json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse sentiment response as JSON: {e}")
            # Return as text if JSON parsing fails
            return {"raw_analysis": response, "parse_error": True}

    def extract_arguments(self, text: str) -> Optional[str]:
        """Extract and analyze legal arguments from the document."""
        if not text or len(text.strip()) < 100:
            return None

        max_chars = 50000
        if len(text) > max_chars:
            text = text[:max_chars]

        prompt = f"""You are an expert legal analyst specializing in argument analysis.

Analyze the following legal document and extract the key legal arguments.

Structure your analysis as follows:

## Petitioner's/Plaintiff's Arguments
- List each major argument with supporting points
- Note the legal provisions or precedents cited

## Respondent's/Defendant's Arguments
- List each major argument with supporting points
- Note the legal provisions or precedents cited

## Court's Analysis (if applicable)
- How did the court evaluate each argument?
- Which arguments were accepted/rejected?

## Precedents Cited
- List important case laws referenced
- Note how they were applied

## Strength Assessment
- Rate the strength of each side's case
- Identify the strongest and weakest arguments

LEGAL DOCUMENT:
\"\"\"
{text}
\"\"\"

Detailed Argument Analysis:"""

        return self._call_gemini(prompt)

    def analyze_case(self, text: str, analysis_type: str) -> Optional[str]:
        """Perform analysis based on the specified type."""
        if analysis_type == "summary":
            return self.generate_summary(text)
        elif analysis_type == "sentiment":
            result = self.analyze_sentiment(text)
            if result:
                return json.dumps(result, indent=2)
            return None
        elif analysis_type == "arguments":
            return self.extract_arguments(text)
        else:
            logger.warning(f"Unknown analysis type: {analysis_type}")
            return None


# Singleton instance
gemini_analysis_service = GeminiAnalysisService()
