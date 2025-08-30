# aws_s3.py
import uuid
import mimetypes
import io
import boto3
from botocore.client import Config
from typing import BinaryIO
from settings import settings

ALLOWED_CT = {"image/jpeg", "image/png", "image/webp", "image/gif"}

def get_s3():
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        endpoint_url=settings.S3_ENDPOINT_URL,
        config=Config(s3={"addressing_style": "virtual"})
    )

def is_allowed_content_type(ct: str | None) -> bool:
    return (ct or "") in ALLOWED_CT

def build_object_key(sub_dir: str | None = None, filename: str | None = None) -> str:
    # 파일명 확장자 유지 + 무작위 UUID
    ext = ""
    if filename and "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()
    # 확장자 없으면 mime으로 추정 (선택)
    if not ext:
        guess = mimetypes.guess_extension("image/jpeg")
        ext = guess or ""
    object_key = ""
    if settings.S3_BUCKET_DIRECTORY and settings.S3_BUCKET_DIRECTORY != "":
        object_key += f"{settings.S3_BUCKET_DIRECTORY}/"
    if sub_dir and sub_dir != "":
        object_key += f"{sub_dir}/"
    object_key += f"{uuid.uuid4()}{ext}"
    return object_key

def upload_fileobj(fp: BinaryIO, key: str, content_type: str):
    s3 = get_s3()
    s3.upload_fileobj(
        Fileobj=fp,
        Bucket=settings.S3_BUCKET,
        Key=key,
        ExtraArgs={
            "ContentType": content_type,
            "ACL": "private",  # 중요: private 유지
            "CacheControl": "public, max-age=31536000"
        }
    )

def presign_get_url(key: str, expires: int = 3600) -> str:
    s3 = get_s3()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.S3_BUCKET, "Key": key},
        ExpiresIn=expires,
    )

def delete_object(key: str):
    s3 = get_s3()
    s3.delete_object(Bucket=settings.S3_BUCKET, Key=key)
