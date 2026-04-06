"""S3 storage service — upload, presign, and delete files."""

import os

import boto3


def _get_client():
    """Create a boto3 S3 client from environment variables.

    When S3_ENDPOINT_URL is set (e.g. to a Cloudflare R2 endpoint), the client
    targets that provider instead of AWS S3.  All API calls are identical.
    """
    kwargs = {
        "region_name": os.getenv("AWS_REGION", "auto"),
        "aws_access_key_id": os.getenv("AWS_ACCESS_KEY_ID"),
        "aws_secret_access_key": os.getenv("AWS_SECRET_ACCESS_KEY"),
    }
    endpoint_url = os.getenv("S3_ENDPOINT_URL")
    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url
    return boto3.client("s3", **kwargs)


def _get_bucket() -> str:
    """Return the S3 bucket name from environment."""
    return os.getenv("AWS_S3_BUCKET_NAME", "")


def upload_file(file_bytes: bytes, s3_key: str, content_type: str) -> bool:
    """Upload file bytes to S3. Return True on success, raise on failure."""
    _get_client().put_object(
        Bucket=_get_bucket(),
        Key=s3_key,
        Body=file_bytes,
        ContentType=content_type,
    )
    return True


def generate_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    """Generate a presigned GET URL for the given S3 key. Default expiry: 1 hour."""
    return _get_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": _get_bucket(), "Key": s3_key},
        ExpiresIn=expires_in,
    )


def download_file(s3_key: str) -> bytes:
    """Download file bytes from S3/R2."""
    response = _get_client().get_object(Bucket=_get_bucket(), Key=s3_key)
    return response["Body"].read()


def delete_file(s3_key: str) -> bool:
    """Delete an object from S3. Return True on success."""
    _get_client().delete_object(Bucket=_get_bucket(), Key=s3_key)
    return True
