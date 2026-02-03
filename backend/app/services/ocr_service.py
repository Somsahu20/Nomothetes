import logging
from pathlib import Path
from typing import Tuple, List

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


class OCRService:
    """Service for extracting text from PDF documents."""

    def __init__(self):
        self._tesseract_available = self._check_tesseract()

    def _check_tesseract(self) -> bool:
        """Check if Tesseract is available."""
        try:
            import pytesseract
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            logger.warning("Tesseract not available, OCR fallback disabled")
            return False

    def extract_text_from_pdf(self, file_path: str) -> Tuple[str, List[dict]]:
        """
        Extract text from PDF file.
        Returns: (full_text, page_texts)
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        doc = fitz.open(file_path)
        page_texts = []
        full_text_parts = []

        for page_num, page in enumerate(doc, 1):
            # Try text extraction first (for text-based PDFs)
            text = page.get_text()

            # If no text found and Tesseract available, try OCR
            if not text.strip() and self._tesseract_available:
                text = self._ocr_page(page)

            page_texts.append({
                "page_number": page_num,
                "text": text
            })
            full_text_parts.append(text)

        doc.close()

        full_text = "\n\n".join(full_text_parts)
        return full_text, page_texts

    def _ocr_page(self, page: fitz.Page) -> str:
        """Perform OCR on a page using Tesseract."""
        try:
            import pytesseract
            from PIL import Image
            import io

            # Render page to image
            pix = page.get_pixmap(dpi=300)
            img_bytes = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_bytes))

            # Perform OCR
            text = pytesseract.image_to_string(img)
            return text

        except Exception as e:
            logger.error(f"OCR failed for page: {e}")
            return ""

    def get_page_count(self, file_path: str) -> int:
        """Get the number of pages in a PDF."""
        doc = fitz.open(file_path)
        count = len(doc)
        doc.close()
        return count


ocr_service = OCRService()
