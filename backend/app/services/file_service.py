import os
import uuid
import re
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException, status

from app.core.config import settings


class FileService:
    """Service for handling file uploads and validation."""

    ALLOWED_MIME_TYPES = ["application/pdf"]
    ALLOWED_EXTENSIONS = [".pdf"]

    def __init__(self):
        self.upload_path = Path(settings.UPLOAD_PATH)
        self.max_file_size = settings.MAX_FILE_SIZE

    def _sanitize_filename(self, filename: str) -> str:
        """Remove dangerous characters from filename."""
        # Remove path separators and null bytes
        filename = os.path.basename(filename)
        # Remove non-alphanumeric except dots, underscores, hyphens
        filename = re.sub(r'[^\w\.\-]', '_', filename)
        # Limit length
        if len(filename) > 200:
            name, ext = os.path.splitext(filename)
            filename = name[:200-len(ext)] + ext
        return filename

    def _validate_extension(self, filename: str) -> bool:
        """Check if file extension is allowed."""
        ext = os.path.splitext(filename)[1].lower()
        return ext in self.ALLOWED_EXTENSIONS

    def _validate_content_type(self, content_type: str) -> bool:
        """Check if content type is allowed."""
        return content_type in self.ALLOWED_MIME_TYPES

    async def validate_file(self, file: UploadFile) -> None:
        """Validate uploaded file."""
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No filename provided"
            )

        if not self._validate_extension(file.filename):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only PDF files are allowed."
            )

        if file.content_type and not self._validate_content_type(file.content_type):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only PDF files are allowed."
            )

        # Check file size by reading content
        content = await file.read()
        await file.seek(0)  # Reset file pointer

        if len(content) > self.max_file_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {self.max_file_size // (1024 * 1024)}MB."
            )

        # Validate PDF magic bytes
        if not content.startswith(b'%PDF'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF file."
            )

    def get_user_upload_dir(self, user_id: str) -> Path:
        """Get or create user's upload directory."""
        user_dir = self.upload_path / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir

    async def save_file(self, file: UploadFile, user_id: str) -> Tuple[str, str]:
        """
        Save uploaded file to disk.
        Returns: (file_path, sanitized_filename)
        """
        user_dir = self.get_user_upload_dir(user_id)

        # Generate unique filename
        file_uuid = str(uuid.uuid4())
        original_name = self._sanitize_filename(file.filename or "document.pdf")
        ext = os.path.splitext(original_name)[1]
        stored_filename = f"{file_uuid}{ext}"

        file_path = user_dir / stored_filename

        # Save file
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        return str(file_path), original_name

    def delete_file(self, file_path: str) -> bool:
        """Delete a file from disk."""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
        except Exception:
            pass
        return False


file_service = FileService()
