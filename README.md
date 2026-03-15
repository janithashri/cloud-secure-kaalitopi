# CloudSecure (Phase 1)

CloudSecure is a Cloud Security Posture Management (CSPM) tool.

- **This Phase 1 build**: Auth (DRF Token), tenant isolation, AWS provider connection, and a foundational web app.
- **External APIs used**: AWS SDK for Python (`boto3`) for a real `sts:AssumeRole` call in `test-connection`.
- **Prowler/Cartography**: not used as runtime dependencies in this Phase 1 project (only architectural reference).

## Prerequisites

- Docker Desktop
- AWS CLI configured on your host (so the backend can use `~/.aws` credentials)
- An AWS account where you can create IAM roles

## Setup

```bash
cd kaali-topi/cloudsecure
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, NEO4J_PASSWORD, SECRET_KEY
make build
make up
make migrate
make createsuperuser
# Visit http://localhost:3000/login
```

## IAM Role Setup (in your AWS account)

### Step 1 — Create the IAM Role trust policy

Replace `YOUR_CLOUDSECURE_ACCOUNT_ID` with the AWS account ID that runs CloudSecure (the principal that will assume the role).

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "AWS": "arn:aws:iam::YOUR_CLOUDSECURE_ACCOUNT_ID:root"
    },
    "Action": "sts:AssumeRole"
  }]
}
```

### Step 2 — Attach this inline permission policy to the role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "resource-explorer-2:Search",
        "resource-explorer-2:GetIndex",
        "s3:GetBucketPolicy", "s3:GetBucketAcl", "s3:GetBucketEncryption",
        "s3:GetBucketVersioning", "s3:GetBucketLogging", "s3:GetPublicAccessBlock",
        "ec2:DescribeInstances", "ec2:DescribeSecurityGroups",
        "iam:GetRole", "iam:GetUser", "iam:ListRolePolicies",
        "iam:GetRolePolicy", "iam:ListUserPolicies", "iam:GetUserPolicy",
        "iam:ListMFADevices",
        "rds:DescribeDBInstances",
        "kms:DescribeKey", "kms:GetKeyPolicy", "kms:GetKeyRotationStatus",
        "cloudtrail:DescribeTrails", "cloudtrail:GetTrailStatus",
        "cloudtrail:GetEventSelectors",
        "sts:GetCallerIdentity"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 3 — Enable Resource Explorer in your AWS account

```bash
aws resource-explorer-2 create-index --type AGGREGATOR --region us-east-1
```

## Troubleshooting

1. **`NoCredentialError` on test-connection**  
   The backend container needs AWS credentials. This project mounts `~/.aws` into the backend container; ensure your host has valid AWS credentials configured, or set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` in `.env`.

2. **`Resource Explorer index not found`**  
   Run the Resource Explorer CLI command above to create an **AGGREGATOR** index in `us-east-1`.

3. **`Neo4j connection refused`**  
   Neo4j takes ~30 seconds to start. Run `make logs` and wait for “Started.”

