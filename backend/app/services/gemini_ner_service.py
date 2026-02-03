import logging
import json
from typing import List, Dict, Any
from dataclasses import dataclass
from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure Gemini client
client = genai.Client(api_key=settings.GEMINI_API_KEY)


@dataclass
class ExtractedEntity:
    """Extracted entity from text."""
    entity_name: str
    entity_type: str
    start_char: int
    end_char: int
    confidence_score: float = 1.0
    page_number: int = 1


class GeminiNERService:
    """Service for Named Entity Recognition using Google Gemini API."""

    # Entity types we extract
    ENTITY_TYPES = ["PERSON", "ORG", "DATE", "LOCATION", "COURT"]

    # System prompt for entity extraction
    SYSTEM_PROMPT = """You are a legal document entity extraction expert specializing in Indian legal documents.

Extract these entity types from the legal text:

1. PERSON - Real human names mentioned in the document
   Examples: "Ramesh Kumar", "Anil Sharma", "Priya Singh", "M.K. Gandhi"
   - Extract full names of petitioners, respondents, judges, advocates, witnesses
   - DO NOT include titles (Hon'ble, Justice, Shri, Smt, Dr., Mr., Mrs.)
   - DO NOT extract role words (Petitioner, Respondent, Appellant, Accused, Complainant)

2. COURT - Specific courts mentioned
   Examples: "Supreme Court of India", "Delhi High Court", "Bombay High Court", "Rajasthan High Court", "Sessions Court Jaipur"
   - MUST be a specific named court
   - Include: High Courts with state name, District Courts with location, Tribunals with full name

3. ORG - Organizations (excluding courts)
   Examples: "Central Bureau of Investigation", "State Bank of India", "Tata Motors", "Income Tax Department"
   - Companies, government departments, agencies, institutions
   - DO NOT include courts here (use COURT type instead)

4. LOCATION - Cities, states, districts mentioned
   Examples: "Mumbai", "Delhi", "Rajasthan", "Jaipur", "Uttar Pradesh", "Chennai"
   - Indian states, cities, districts, villages

5. DATE - Specific dates
   Examples: "15th January 2023", "2020", "March 2019", "01.05.2022"
   - Must contain year, month, or specific day

DO NOT EXTRACT:
- Legal jargon (petition, writ, bail, FIR, IPC, CrPC)
- Case citations (AIR 2020 SC 123)
- Article/Section references
- Role descriptions (Government Advocate, Learned Counsel)

Return a JSON array:
[
  {"name": "Entity Name", "type": "PERSON|COURT|ORG|LOCATION|DATE"}
]

If no valid entities found, return: []"""

    def __init__(self):
        self.model_name = "gemini-2.5-flash"

    def _clean_response(self, response_text: str) -> List[Dict[str, str]]:
        """Parse and clean the Gemini response."""
        try:
            # Try to find JSON array in response
            # Remove markdown code blocks if present
            text = response_text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            # Parse JSON
            entities = json.loads(text)

            if not isinstance(entities, list):
                return []

            # Validate and clean entities
            valid_entities = []
            seen = set()

            for entity in entities:
                if not isinstance(entity, dict):
                    continue

                name = entity.get("name", "").strip()
                entity_type = entity.get("type", "").upper().strip()

                # Skip invalid entries
                if not name or not entity_type:
                    continue
                if entity_type not in self.ENTITY_TYPES:
                    continue
                if len(name) < 2:
                    continue
                if len(name) > 100:
                    continue

                # Deduplicate
                key = (name.lower(), entity_type)
                if key in seen:
                    continue
                seen.add(key)

                valid_entities.append({
                    "name": name,
                    "type": entity_type
                })

            return valid_entities

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse Gemini response as JSON: {e}")
            return []
        except Exception as e:
            logger.error(f"Error cleaning Gemini response: {e}")
            return []

    def extract_entities(self, text: str, page_number: int = 1) -> List[ExtractedEntity]:
        """Extract named entities from text using Gemini."""
        if not text or not text.strip():
            return []

        # Limit text length for API
        max_chars = 30000
        if len(text) > max_chars:
            text = text[:max_chars]

        try:
            # Create prompt
            prompt = f"""{self.SYSTEM_PROMPT}

TEXT TO ANALYZE:
\"\"\"
{text}
\"\"\"

Extract entities and return as JSON array:"""

            # Call Gemini API using the new client
            response = client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={
                    "temperature": 0.1,
                    "max_output_tokens": 2048,
                }
            )

            if not response or not response.text:
                logger.warning("Empty response from Gemini")
                return []

            # Parse response
            raw_entities = self._clean_response(response.text)

            # Convert to ExtractedEntity objects
            entities = []
            for entity_data in raw_entities:
                entity = ExtractedEntity(
                    entity_name=entity_data["name"],
                    entity_type=entity_data["type"],
                    start_char=0,  # Gemini doesn't provide position
                    end_char=0,
                    confidence_score=0.9,  # High confidence from LLM
                    page_number=page_number
                )
                entities.append(entity)

            logger.info(f"Gemini extracted {len(entities)} entities from page {page_number}")
            return entities

        except Exception as e:
            logger.error(f"Gemini entity extraction failed: {e}")
            return []

    def extract_from_pages(self, page_texts: List[Dict[str, Any]]) -> List[ExtractedEntity]:
        """Extract entities from multiple pages."""
        all_entities = []

        for page_data in page_texts:
            page_num = page_data.get("page_number", 1)
            text = page_data.get("text", "")
            entities = self.extract_entities(text, page_number=page_num)
            all_entities.extend(entities)

        return self.deduplicate_entities(all_entities)

    def deduplicate_entities(self, entities: List[ExtractedEntity]) -> List[ExtractedEntity]:
        """Remove duplicate entities across pages."""
        seen = {}
        for entity in entities:
            key = (entity.entity_name.lower(), entity.entity_type)
            if key not in seen or entity.confidence_score > seen[key].confidence_score:
                seen[key] = entity
        return list(seen.values())


# Create singleton instance
gemini_ner_service = GeminiNERService()
