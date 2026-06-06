import os
import logging
import uuid
import boto3
from botocore.config import Config
from backend.config import settings

logger = logging.getLogger(__name__)

# Ensure local exports folder exists in case of fallback
LOCAL_EXPORTS_DIR = "./exports"
os.makedirs(LOCAL_EXPORTS_DIR, exist_ok=True)

class ExportService:
    def __init__(self):
        self.s3_client = None
        self._initialize_s3()

    def _initialize_s3(self):
        # Check if R2 credentials are set
        if (
            settings.R2_ACCOUNT_ID and 
            settings.R2_ACCESS_KEY_ID and 
            settings.R2_SECRET_ACCESS_KEY and
            settings.R2_BUCKET_NAME
        ):
            try:
                # Cloudflare R2 endpoint URL template
                endpoint_url = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
                
                self.s3_client = boto3.client(
                    "s3",
                    endpoint_url=endpoint_url,
                    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
                    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
                    config=Config(signature_version="s3v4"),
                    region_name="auto"
                )
                logger.info(f"Initialized Cloudflare R2 exporter on bucket: {settings.R2_BUCKET_NAME}")
            except Exception as e:
                logger.warning(f"Could not connect to Cloudflare R2: {e}. Falling back to local file exporter.")
                self.s3_client = None
        else:
            logger.info("Cloudflare R2 credentials not configured. Falling back to local file exporter.")

    async def save_export(self, file_bytes: bytes, file_extension: str) -> str:
        """
        Saves exported PDF/DOCX bytes.
        Returns a URL to access/download the file.
        """
        filename = f"{uuid.uuid4()}.{file_extension.strip('.')}"
        
        # 1. Try to upload to Cloudflare R2
        if self.s3_client and settings.R2_BUCKET_NAME:
            try:
                content_type = "application/pdf" if file_extension.lower() == "pdf" else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                
                # Upload bytes
                self.s3_client.put_object(
                    Bucket=settings.R2_BUCKET_NAME,
                    Key=filename,
                    Body=file_bytes,
                    ContentType=content_type
                )
                
                # Generate 1-hour presigned URL
                presigned_url = self.s3_client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": settings.R2_BUCKET_NAME, "Key": filename},
                    ExpiresIn=3600
                )
                logger.info(f"Uploaded {filename} to Cloudflare R2. Presigned URL generated.")
                return presigned_url
            except Exception as e:
                logger.error(f"Failed to upload to Cloudflare R2: {e}. Falling back to local export.")
                
        # 2. Local fallback storage
        local_path = os.path.join(LOCAL_EXPORTS_DIR, filename)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
            
        logger.info(f"Saved export locally at {local_path}.")
        # Return local download route url
        return f"/api/exports/download/{filename}"

export_service = ExportService()
