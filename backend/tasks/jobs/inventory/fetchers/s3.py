import json

from ..throttle import with_backoff


@with_backoff()
def fetch_s3_config(session, arn: str, region: str) -> dict:
    bucket_name = arn.split(":::")[-1]
    s3 = session.client("s3", region_name="us-east-1")
    config = {"bucket_name": bucket_name}

    try:
        r = s3.get_public_access_block(Bucket=bucket_name)
        config["public_access_block"] = r.get("PublicAccessBlockConfiguration", {})
    except s3.exceptions.NoSuchPublicAccessBlockConfiguration:
        config["public_access_block"] = None

    try:
        r = s3.get_bucket_policy(Bucket=bucket_name)
        config["policy"] = json.loads(r["Policy"])
    except s3.exceptions.NoSuchBucketPolicy:
        config["policy"] = None

    try:
        r = s3.get_bucket_encryption(Bucket=bucket_name)
        rules = r["ServerSideEncryptionConfiguration"]["Rules"]
        config["encryption"] = [
            rule["ApplyServerSideEncryptionByDefault"] for rule in rules
        ]
    except Exception:
        config["encryption"] = None

    r = s3.get_bucket_versioning(Bucket=bucket_name)
    config["versioning"] = r.get("Status", "Disabled")

    r = s3.get_bucket_logging(Bucket=bucket_name)
    config["logging_enabled"] = "LoggingEnabled" in r

    r = s3.get_bucket_acl(Bucket=bucket_name)
    config["acl_grants"] = [
        {
            "grantee": g["Grantee"].get("URI", g["Grantee"].get("ID", "")),
            "permission": g["Permission"],
        }
        for g in r.get("Grants", [])
    ]

    return config
