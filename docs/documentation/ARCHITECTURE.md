# CloudSecure Architecture and Technology Justification

## 1. Project Overview

CloudSecure is a self-hosted Cloud Security Posture Management (CSPM) platform for AWS. Its purpose is to help a team connect an AWS account, discover cloud resources, evaluate those resources against security and compliance rules, visualize relationships between resources, identify attack paths, scan Terraform repositories, and generate remediation guidance.

The project is built as a multi-service system rather than a single monolithic script because CSPM work has several different workloads:

- User-facing workflows need a responsive dashboard.
- AWS inventory collection can take time and must run asynchronously.
- Rule evaluation needs repeatable policy logic.
- Graph analysis needs relationship-aware storage.
- IaC scanning needs repository cloning and external scanner execution.
- Reporting and remediation need persisted findings that can be filtered, suppressed, exported, and revisited.

The repository is organized into four major parts:

- `frontend/`: React dashboard used by end users.
- `backend/`: Django REST API, authentication, provider management, inventory scanning, findings, custom rules, deep scan, attack-path analysis, and IaC scan persistence.
- `IaC_backend/`: Standalone Flask service for cloning repositories, running tfsec, producing AI remediation, and exporting PDF/CSV reports.
- `Cloudsecure_cli/`: Python CLI for local Terraform/IaC scans and report generation.

Supporting infrastructure is defined in `docker-compose.yml`, with PostgreSQL, Valkey, Neo4j, OPA, Django, Celery workers, and React services.

## 2. High-Level Architecture

```text
Browser
  |
  | React + Vite frontend
  v
Django REST API
  |
  |-- PostgreSQL: users, tenants, providers, scan runs, resources, findings
  |-- Valkey/Redis: Celery broker and result backend
  |-- Celery workers: inventory pulls, deep scans, IaC scans
  |-- OPA: Rego policy evaluation
  |-- Neo4j: resource graph and attack-path graph
  |-- AWS APIs through boto3 and STS AssumeRole
  |-- Sarvam AI API for remediation guidance
  |
  v
AWS Account / GitHub Repository / Terraform Files
```

The frontend does not directly call AWS or databases. It communicates with the Django API. The backend owns authentication, tenant isolation, background task orchestration, resource normalization, policy evaluation, and persistence. Long-running work is pushed to Celery so the UI remains responsive.

## 3. Main Components

### 3.1 Frontend

Location: `frontend/`

The frontend is built with React 18, Vite, Tailwind CSS, React Router, Axios, Recharts, Heroicons, jsPDF, and jsPDF AutoTable.

Important files:

- `frontend/src/App.jsx`: Defines routes and protected pages.
- `frontend/src/context/AuthContext.jsx`: Manages authentication state and authenticated Axios API access.
- `frontend/src/pages/DashboardPage.jsx`: Security posture overview.
- `frontend/src/pages/ScanPage.jsx`: Starts inventory scans and shows scan status.
- `frontend/src/pages/FindingsPage.jsx`: Lists cloud findings.
- `frontend/src/pages/DeepScanPage.jsx`: Shows graph/deep-scan workflows.
- `frontend/src/pages/IaCFindingsPage.jsx`: Shows IaC findings.
- `frontend/src/components/GraphCanvas.jsx`: Visual graph display.
- `frontend/src/utils/reportExport.js`: Client-side report export helpers.

Why React was used:

React is suitable for this project because the UI has many stateful views: authentication state, selected providers, scan progress, finding filters, dashboard metrics, and graph interactions. Component-based UI also allows reusable pieces such as provider cards, finding badges, charts, tables, detail panels, and navigation.

Why Vite was used:

Vite gives a fast development server and simple build pipeline. For a student/team project or fast-moving prototype, it reduces setup complexity compared with heavier frontend build systems.

Why Tailwind CSS was used:

Tailwind helps build a consistent dashboard quickly using utility classes. It avoids maintaining a large custom CSS framework while still supporting responsive layouts, dark UI panels, spacing, typography, and severity colors.

Why Axios was used:

Axios provides a simple HTTP client abstraction for calling Django APIs. It is convenient for attaching auth tokens and sharing API helpers across pages.

Why React Router was used:

The product has several dashboard sections: login, dashboard, connect, providers, scan, findings, deep scan, reports, docs, and IaC views. React Router cleanly maps these views to URLs and protects authenticated routes.

Why Recharts was used:

The dashboard needs severity, resource-type, and framework charts. Recharts integrates well with React and is enough for operational dashboard visualizations without needing a heavier charting library.

Why jsPDF and jsPDF AutoTable were used:

Security tools often need exportable reports. jsPDF and AutoTable make it possible to generate downloadable client-side PDF reports from finding tables.

### 3.2 Django Backend

Location: `backend/`

The backend is the main application server. It is built with Django, Django REST Framework, Django token authentication, django-cors-headers, Celery, django-celery-beat, boto3, Neo4j driver, OPA integration, PostgreSQL, and Checkov/tfsec-related tooling.

Important files:

- `backend/cloudsecure/settings/base.py`: Core settings for Django, DRF, Celery, PostgreSQL, Neo4j, OPA, and AWS drift configuration.
- `backend/cloudsecure/urls.py`: Root API routing.
- `backend/accounts/models.py`: Tenant and user profile model.
- `backend/providers/models.py`: AWS provider/account connection model.
- `backend/api/models.py`: Inventory runs, resource configs, findings, custom rules, IaC findings, and deep scans.
- `backend/providers/v1/views.py`: Provider CRUD, connection testing, inventory run APIs.
- `backend/api/v1/views.py`: Authentication, graph APIs, findings APIs, custom rules, attack engine, IaC APIs.
- `backend/tasks/tasks.py`: Celery task for inventory scans.
- `backend/api/tasks.py`: Celery task for IaC repository scans.

Why Django was used:

Django is a strong fit because the backend needs authentication, admin tooling, ORM models, migrations, relational data handling, middleware, and structured API development. A CSPM product has many persistent entities such as users, tenants, providers, scans, resources, findings, and custom rules. Django gives a mature foundation for those concerns.

Why Django REST Framework was used:

The frontend consumes JSON APIs. DRF provides APIView classes, serializers, authentication integration, permissions, pagination, and response handling. This reduces boilerplate and keeps API code consistent.

Why token authentication was used:

The frontend is a browser-based SPA. DRF token authentication gives a simple login flow where the frontend stores a token and sends it with API requests. It is simpler than a full OAuth/OIDC setup for this project while still allowing authenticated API access.

Why multi-tenancy was added:

Cloud security tools are commonly used by teams, clients, or separate workspaces. The `Tenant` and `UserProfile` models let each user belong to a workspace, and provider/finding queries are scoped by tenant. This prevents one workspace from seeing another workspace's AWS accounts or results.

### 3.3 PostgreSQL

PostgreSQL is used as the primary relational database.

It stores:

- Users and authentication data.
- Tenants and user profiles.
- Providers and AWS account connection details.
- Inventory scan runs.
- Normalized resource configurations.
- Resource hashes for delta scanning.
- Security findings.
- Custom Rego rules.
- IaC findings.
- Deep scan state.

Why PostgreSQL was used:

PostgreSQL is reliable for structured application state and supports JSON fields. The project needs relational integrity for users, tenants, providers, scans, and findings, while also storing flexible AWS resource configuration payloads. PostgreSQL handles both needs well.

Important models:

- `Tenant`: Workspace boundary.
- `UserProfile`: Links a Django user to a tenant.
- `Provider`: AWS account connection configuration.
- `InventoryRun`: Tracks each inventory scan state and statistics.
- `ResourceStateHash`: Stores hashes used to detect resource changes.
- `ResourceConfig`: Stores normalized AWS resource configuration.
- `Finding`: Stores policy violations.
- `CustomRule`: Stores tenant-created Rego policies.
- `IaCFinding`: Stores Terraform/IaC scan findings.
- `DeepScan`: Tracks graph ingestion scans.

### 3.4 Celery and Valkey

Celery is used for background jobs. Valkey is used as the Redis-compatible broker and result backend.

Queues:

- `inventory`: AWS inventory scanning and rule evaluation.
- `deep_scan`: graph/deep-scan ingestion.
- `default`: general tasks.

Why Celery was used:

AWS inventory scans, deep graph ingestion, and repository scanning can take more time than a normal HTTP request should take. Celery allows these jobs to run asynchronously while the API immediately returns a queued or started status. It also supports retries, queue routing, and separate worker concurrency.

Why Valkey was used:

Celery needs a message broker. Valkey is Redis-compatible and works well for task queues and lightweight result storage. It is simple to run in Docker and does not require the complexity of a heavier broker for this project.

Why separate workers were used:

The Docker Compose file defines:

- `celery`: inventory worker.
- `celery-beat`: scheduled jobs.
- `celery-deep-scan`: deep scan worker with its own queue.

This separation prevents graph-heavy deep scans from blocking normal inventory tasks.

### 3.5 AWS Integration

AWS integration is implemented with boto3.

The provider model stores:

- AWS account ID.
- IAM role name.
- Connection verification state.

Connection flow:

1. User creates a provider with AWS account ID and role name.
2. Backend builds the role ARN.
3. Backend calls STS `AssumeRole`.
4. If successful, the provider is marked as verified.
5. Inventory scanning can then use temporary assumed-role credentials.

Why STS AssumeRole was used:

AssumeRole is the correct AWS pattern for cross-account access. CloudSecure does not need permanent access keys for each scanned account. Instead, the target AWS account creates a read-only role, and CloudSecure assumes it temporarily. This is safer and easier to revoke.

Why read-only permissions were used:

CSPM scanning should inspect configuration, not mutate infrastructure. The included `permissions-policy.json` focuses on read operations such as S3 bucket settings, EC2 security groups, IAM policies, RDS configuration, KMS key settings, CloudTrail, Resource Explorer, and STS identity checks.

Why AWS Resource Explorer was used:

Resource Explorer provides a broad inventory discovery entry point. It helps find resources across supported AWS services and regions without manually listing every resource type first. The inventory pipeline then fetches detailed configuration with service-specific fetchers.

### 3.6 Inventory Pipeline

Location: `backend/tasks/jobs/inventory/`

Main flow:

1. Frontend triggers an inventory pull.
2. Django creates or queues an inventory task.
3. Celery creates an `InventoryRun`.
4. The inventory job assumes the provider role.
5. AWS Resource Explorer discovers resources.
6. The pipeline compares current resources with stored hashes.
7. New or changed resources are fetched in detail.
8. Resource configs are saved to PostgreSQL.
9. Resource nodes and relationships are written to Neo4j.
10. OPA/Rego rules are evaluated.
11. Findings are created or updated.
12. Deleted resources are tombstoned.
13. Scan statistics are saved.

Important files:

- `backend/tasks/jobs/inventory/aws.py`: Main inventory orchestration.
- `backend/tasks/jobs/inventory/config.py`: AWS session/client helpers.
- `backend/tasks/jobs/inventory/fetchers/`: Service-specific AWS config fetchers.
- `backend/tasks/jobs/inventory/hashing.py`: Resource hash calculation.
- `backend/tasks/jobs/inventory/state.py`: Load/save resource state hashes.
- `backend/tasks/jobs/inventory/neo4j_writer.py`: Writes resource graph nodes.
- `backend/tasks/jobs/inventory/config_drift.py`: Optional AWS Config drift signals.

Why delta scanning was used:

Cloud accounts can contain many resources, and repeatedly fetching every detail on every scan is slow and wasteful. Delta scanning compares current resource/tag/config hashes with previous state. New or changed resources are evaluated, while unchanged resources can be skipped. This reduces AWS API calls, improves scan time, and lowers rate-limit risk.

Why resource configs are stored:

Persisting `ResourceConfig` allows findings to be re-evaluated later, supports dashboard views, and helps recover if OPA was temporarily unavailable. The code includes a fallback that re-evaluates stored resources with zero findings.

Why tombstoning was used:

When a resource disappears, the graph marks it as `DELETED` rather than simply losing historical context immediately. This is useful for understanding drift and avoiding stale active graph nodes.

### 3.7 Service-Specific Fetchers

Location: `backend/tasks/jobs/inventory/fetchers/`

Fetchers exist for:

- S3
- EC2
- IAM
- RDS
- KMS
- CloudTrail
- Security groups

Why fetchers were separated:

Each AWS service has different APIs and configuration structures. Separate fetchers keep service-specific logic isolated and make it easier to add new services later without making the main inventory loop unreadable.

### 3.8 OPA and Rego Rule Engine

OPA is used as the policy decision engine, and Rego is used as the policy language.

Important files:

- `backend/tasks/jobs/rule_engine/evaluator.py`
- `backend/tasks/jobs/rule_engine/input_builder.py`
- `backend/tasks/jobs/rule_engine/opa_client.py`
- `backend/tasks/jobs/inventory/rules/*.rego`
- `backend/compliance_rules/*.md`

Rule categories include:

- CIS AWS rules.
- India-specific compliance rules.
- Custom tenant rules.

Why OPA was used:

OPA separates security policy from application code. Instead of hardcoding every check inside Python, rules can be expressed declaratively in Rego. This makes the rule system easier to extend, audit, and map to compliance frameworks.

Why Rego was used:

Rego is designed for policy evaluation over structured JSON input. AWS resource configs are naturally represented as JSON, so Rego can check properties such as encryption, public access, MFA, key rotation, and logging.

Why custom rules were added:

Different organizations may have different security requirements. The `CustomRule` model lets a tenant define additional Rego policies without changing the backend codebase. This turns the scanner from a fixed checklist into an extensible policy platform.

### 3.9 Findings System

Findings are stored in the `Finding` model.

Each finding includes:

- Tenant and provider.
- Inventory run.
- ARN and account ID.
- Resource type and region.
- Rule ID and rule name.
- Severity.
- Status.
- Compliance framework mappings.
- Remediation steps.
- Raw finding payload.
- First seen and last seen timestamps.

Why findings are persisted:

Persisted findings allow users to track posture over time, filter by severity/framework/resource type, suppress accepted risk, export reports, and compare current state with previous scans.

Why suppression exists:

Some findings may represent accepted risk or temporary exceptions. Suppression lets users hide them from active work queues without deleting the evidence.

Why findings use `first_seen` and `last_seen`:

These fields distinguish new issues from recurring issues. This is important for security operations because a long-standing unresolved issue has different meaning from a newly introduced one.

### 3.10 Neo4j Graph Layer

Neo4j is used for graph storage and attack-path analysis.

There are two graph-related paths:

- Basic inventory graph written by `neo4j_writer.py`.
- Deep scan graph ingestion using Cartography-style ingestion and update tags.

Why Neo4j was used:

Cloud security is relationship-heavy. Attack paths depend on how identities, policies, networks, buckets, instances, and trust relationships connect. A relational database can store resources, but graph traversal is much more natural in Neo4j. Cypher queries can directly express paths such as "public security group plus admin role" or "role trusts external principal."

Graph data includes:

- AWS account nodes.
- Resource nodes.
- Belongs-to relationships.
- VPC/security group relationships.
- IAM/policy relationships from deep scans.
- Public exposure and attack path relationships.

Why graph snapshots use update tags:

Deep scans can produce multiple graph snapshots. Update tags allow the UI and attack engine to query only the nodes and relationships from the relevant scan. This prevents stale graph data from mixing with current scan results.

### 3.11 Deep Scan

Location: `backend/tasks/jobs/deep_scan/`

Deep scan is a graph ingestion workflow that runs separately from the normal inventory scan.

Main flow:

1. User starts a deep scan for a provider.
2. Django creates a `DeepScan` record.
3. Celery queues the deep scan on the `deep_scan` queue.
4. The worker assumes the AWS role.
5. Graph ingestion runs.
6. Neo4j indexes are created.
7. Findings and internet exposure signals are synchronized.
8. Graph data may be copied to a tenant-specific Neo4j database/session.
9. Old scan graphs are marked deleted.
10. Scan state and progress are updated.

Important files:

- `backend/api/routes/deep_scan.py`
- `backend/tasks/jobs/deep_scan/scan.py`
- `backend/tasks/jobs/deep_scan/db_utils.py`
- `backend/tasks/jobs/deep_scan/sync.py`
- `backend/tasks/jobs/deep_scan/findings.py`
- `backend/tasks/jobs/deep_scan/internet.py`
- `backend/tasks/jobs/deep_scan/indexes.py`

Why deep scan is separate from inventory scan:

The normal inventory scan is optimized for resource discovery, configuration checks, and fast findings. Deep scan is optimized for graph-rich ingestion and attack-path analysis. Keeping them separate lets users run lightweight scans frequently and heavier graph scans when needed.

### 3.12 Attack Engine

Location: `backend/tasks/jobs/attack_engine/`

The attack engine runs predefined Cypher queries against Neo4j.

Example attack patterns include:

- Public EC2 with admin IAM role.
- Public data plane with missing encryption.
- Public S3 bucket with sensitive indicators.
- PassRole-like privilege escalation.
- IAM user with AdministratorAccess.
- Cross-account trust enabling lateral movement.
- CloudTrail logging weakness.
- Public bucket without access logging.

Why Cypher queries were used:

Attack paths are graph patterns. Cypher directly expresses relationships such as account -> security group -> public IP range, or role -> policy -> statement -> privilege. This makes the attack engine easier to read and extend than deeply nested Python logic.

Why MITRE mappings were included:

Mapping attack paths to MITRE ATT&CK gives findings a threat-modeling context. Instead of only saying "this is misconfigured," the system can explain how the condition may support initial access, privilege escalation, defense evasion, lateral movement, or exfiltration.

### 3.13 IaC Scanning in Django Backend

Location: `backend/api/tasks.py`

The Django-backed IaC flow:

1. User submits a repository URL.
2. API checks whether findings for that repository already exist for the user.
3. If not, Celery starts `perform_iac_scan`.
4. The task clones the repository into a temporary directory.
5. The task runs `tfsec` with JSON output.
6. The task parses findings.
7. High and critical findings are sent for Sarvam AI remediation.
8. Findings are saved as `IaCFinding` rows.
9. The temporary repository directory is removed.

Why IaC scanning was added:

Runtime cloud scanning finds what already exists in AWS. IaC scanning finds risky Terraform before or during deployment. Combining both gives better coverage: prevention through IaC checks and detection through cloud inventory checks.

Why tfsec was used:

tfsec is purpose-built for Terraform security scanning. It understands Terraform resources and produces rule IDs, severities, descriptions, file paths, line numbers, and JSON output that can be stored and displayed.

Why repository cloning is shallow:

The scanner only needs the current files, not full Git history. Shallow clone improves speed and reduces disk usage.

Why results are cached by repository:

If a repository was already scanned for a user, the API can return existing findings immediately. This improves UI responsiveness and avoids duplicate work.

### 3.14 Standalone IaC Backend

Location: `IaC_backend/`

This is a Flask service that provides repository IaC scanning and export APIs.

Important files:

- `IaC_backend/run.py`
- `IaC_backend/app/routes/scanner.py`
- `IaC_backend/app/services/github_service.py`
- `IaC_backend/app/services/scan_service.py`
- `IaC_backend/app/services/ai_service.py`
- `IaC_backend/app/utils/reporting.py`
- `IaC_backend/app/utils/file_manager.py`

Tools used:

- Flask for API routes.
- flask-cors for frontend access.
- GitPython for repository cloning.
- tfsec through subprocess for Terraform scanning.
- Sarvam AI through HTTP requests for remediation.
- ReportLab for PDF generation.

Why Flask was used here:

Flask is lightweight and works well for a focused microservice. The IaC scanner service has a narrow responsibility: clone, scan, enrich, export. It does not need Django's full ORM/admin/auth stack when used standalone.

Why a separate IaC service can be useful:

Separating IaC scanning allows it to be deployed independently, scaled separately, or reused outside the main Django backend. It also reduces coupling between repository-scanning logic and cloud-inventory logic.

### 3.15 CloudSecure CLI

Location: `Cloudsecure_cli/`

The CLI provides local Terraform scanning.

Important files:

- `Cloudsecure_cli/cloudsecure/cli.py`
- `Cloudsecure_cli/cloudsecure/scanners/terraform.py`
- `Cloudsecure_cli/cloudsecure/utils/reporting.py`
- `Cloudsecure_cli/setup.py`

Tools used:

- Click for command-line interface.
- Rich for formatted terminal output.
- tfsec for Terraform scanning.
- ReportLab for PDF export.
- CSV utilities for CSV export.

Why a CLI was built:

Not every scan should require the web dashboard. Developers may want to scan Terraform locally before committing code. The CLI supports shift-left security by bringing IaC checks into the terminal.

Why Click was used:

Click makes it easy to define commands, arguments, flags, version output, and help text.

Why Rich was used:

Security scan results are easier to understand when formatted with tables, severity colors, panels, and progress indicators. Rich improves terminal readability.

## 4. API and User Flows

### 4.1 Registration and Login

1. User registers with username/email/password.
2. Django creates a `User`.
3. Django creates or assigns a `Tenant`.
4. Django creates a `UserProfile`.
5. User logs in.
6. DRF token is returned.
7. Frontend stores and sends token with API calls.

Design justification:

This keeps authentication simple and tenant-aware. Every provider and finding can be scoped through `request.user.profile.tenant`.

### 4.2 Connect AWS Account

1. User enters AWS account ID and role name.
2. Backend stores a `Provider`.
3. User tests connection.
4. Backend calls STS AssumeRole.
5. If successful, provider is marked verified.
6. Scheduled inventory can be enabled.

Design justification:

Testing connection before scanning prevents failed scans caused by wrong role names or trust policies. It also gives immediate user feedback.

### 4.3 Inventory Scan

1. User starts scan from UI.
2. API checks for already running scan.
3. API queues Celery task.
4. Celery performs AWS discovery and config fetching.
5. PostgreSQL stores scan run, resource config, hashes, findings.
6. Neo4j stores graph relationships.
7. Frontend polls scan runs and findings.

Design justification:

This flow is asynchronous and fault-tolerant. The user does not wait on a long HTTP request, and scan state is visible through `InventoryRun`.

### 4.4 Findings Review

1. Frontend requests findings for a provider.
2. Backend filters by tenant and provider.
3. Optional filters include status, severity, resource type, and compliance framework.
4. User can suppress a finding.

Design justification:

Security teams need triage workflows. Filters and suppression make the findings list operational rather than just informational.

### 4.5 Deep Scan and Attack Path

1. User starts deep scan.
2. Celery ingests graph data.
3. Neo4j stores graph snapshot.
4. User runs attack engine queries.
5. Backend returns violated attack patterns and graph nodes/edges.

Design justification:

Attack-path analysis needs graph context. Running it after a deep scan avoids mixing graph ingestion with lighter inventory scan responsibilities.

### 4.6 IaC Scan

1. User submits Git repository URL.
2. Backend checks existing scan results.
3. If needed, Celery clones and scans repository.
4. tfsec returns JSON findings.
5. High/critical findings receive AI remediation.
6. Findings are stored and shown in the dashboard.

Design justification:

The same product covers both deployed cloud infrastructure and pre-deployment Terraform. This gives users a more complete security workflow.

## 5. Tooling and Why Each Tool Was Used

| Tool | Used In | Purpose | Why It Was Chosen |
|---|---|---|---|
| React 18 | Frontend | Interactive UI | Component-based dashboard with reusable UI pieces |
| Vite | Frontend | Dev server/build | Fast development and simple configuration |
| Tailwind CSS | Frontend | Styling | Rapid consistent UI styling without a large custom CSS system |
| React Router | Frontend | Routing | Clean page-based SPA navigation and protected routes |
| Axios | Frontend | API calls | Simple HTTP client with token support |
| Recharts | Frontend | Charts | Dashboard charts for severity, resources, and frameworks |
| Heroicons | Frontend | Icons | Consistent visual icons |
| jsPDF | Frontend | PDF export | Generates downloadable reports |
| jsPDF AutoTable | Frontend | PDF tables | Formats finding tables inside PDFs |
| Django | Backend | Web/API framework | Mature auth, ORM, migrations, middleware, admin |
| Django REST Framework | Backend | REST APIs | Serializers, permissions, API views, token auth |
| django-cors-headers | Backend | CORS | Allows local frontend to call backend |
| PostgreSQL | Backend | Primary DB | Reliable relational storage plus JSON fields |
| psycopg | Backend | PostgreSQL driver | Django/PostgreSQL connectivity |
| Celery | Backend | Async tasks | Long-running scans outside HTTP request cycle |
| django-celery-beat | Backend | Scheduled tasks | Database-backed periodic scans |
| Valkey | Infrastructure | Broker/backend | Redis-compatible queue storage for Celery |
| boto3 | Backend | AWS SDK | Official AWS API access from Python |
| STS AssumeRole | AWS | Cross-account access | Temporary, revocable, read-only scanning model |
| AWS Resource Explorer | AWS | Resource discovery | Broad AWS inventory discovery |
| AWS Config | Optional backend | Drift signals | Detects config changes not visible through tags |
| OPA | Backend/infrastructure | Policy engine | Decouples policy decisions from Python code |
| Rego | Backend/rules | Policy language | Declarative checks over JSON resource input |
| Neo4j | Backend/infrastructure | Graph DB | Natural storage/query model for attack paths |
| Cypher | Backend | Graph queries | Expresses attack path patterns clearly |
| Cartography | Backend | Cloud graph ingestion support | Helps model AWS relationships for deep scan |
| policyuniverse | Backend | IAM policy analysis support | Helps reason about IAM policies and permissions |
| aioboto3 | Backend | Async AWS SDK support | Useful for scalable AWS interactions |
| Checkov | Backend dependency | IaC/security scanning support | Recognized IaC scanner, included for policy scanning workflows |
| tfsec | Backend/IaC/CLI | Terraform scanning | Terraform-specific security scanner with JSON output |
| Sarvam AI API | Backend/IaC | Remediation guidance | Generates India-focused explanatory remediation text |
| Flask | IaC backend | Lightweight API service | Small focused service for clone/scan/export flow |
| flask-cors | IaC backend | CORS | Allows browser calls to IaC service |
| GitPython | IaC backend | Clone repositories | Python-native Git operations |
| requests | IaC backend/backend | HTTP calls | Calling AI APIs and external services |
| ReportLab | IaC backend/CLI | PDF reports | Server/CLI-side PDF generation |
| Click | CLI | Command parsing | Clean command-line interface |
| Rich | CLI | Terminal UI | Tables, panels, progress, colors |
| Docker | Infrastructure | Containerization | Reproducible local environment |
| Docker Compose | Infrastructure | Multi-service orchestration | Runs app, DB, broker, graph DB, OPA, workers together |
| Makefile | Developer workflow | Command shortcuts | Simplifies build/up/migrate/log commands |

## 6. Design Choices and Justification

### 6.1 Modular Multi-Service Design

The system uses separate services for frontend, backend, workers, database, broker, graph database, OPA, and IaC scanning.

Justification:

Each service has different scaling and runtime needs. The frontend serves UI, Django serves APIs, Celery runs long jobs, PostgreSQL stores transactional data, Neo4j stores graph relationships, and OPA evaluates policy. Keeping these concerns separate improves maintainability and makes failures easier to isolate.

### 6.2 Asynchronous Scanning

Inventory, deep scan, and IaC scans run through Celery instead of direct API requests.

Justification:

Cloud scans can be slow, rate-limited, or partially failing. Background execution lets the API return quickly, supports retries, records progress, and avoids browser timeouts.

### 6.3 Read-Only AWS Access

The scanner uses read-only IAM permissions and STS AssumeRole.

Justification:

A CSPM scanner should not change customer infrastructure. Read-only temporary credentials reduce blast radius and match security best practices.

### 6.4 Policy as Code

Security checks are implemented using OPA/Rego.

Justification:

Security rules change often. Keeping them as policy files makes them easier to add, audit, test, and map to compliance frameworks. It also allows custom tenant policies.

### 6.5 Graph-Based Attack Paths

Neo4j is used for relationships and attack engine queries.

Justification:

Cloud attack paths are not isolated misconfigurations. Risk often appears when multiple conditions connect, such as public network exposure plus privileged identity. Graph databases are designed for this kind of relationship traversal.

### 6.6 Delta Inventory

The inventory pipeline uses hashes to detect new, changed, and deleted resources.

Justification:

Repeatedly fetching all cloud resources is inefficient. Delta scanning reduces API calls, improves performance, and lowers throttling risk while still detecting changed resources.

### 6.7 Tenant Isolation

Most queries are scoped by tenant.

Justification:

Cloud security findings are sensitive. Tenant isolation prevents one workspace from accessing another workspace's providers, scans, findings, and graph results.

### 6.8 Separate Runtime and IaC Security

The platform scans both AWS runtime infrastructure and Terraform repositories.

Justification:

Runtime scanning detects deployed misconfigurations. IaC scanning prevents misconfigurations before deployment. A complete cloud security workflow should support both.

### 6.9 AI-Assisted Remediation

High and critical IaC findings can be enriched with Sarvam AI remediation.

Justification:

Security findings are more useful when they include actionable remediation. AI-generated guidance helps users understand risk and possible Terraform fixes, especially when findings are complex.

### 6.10 Docker Compose Local Environment

The project uses Docker Compose to run all major services.

Justification:

The application depends on several services. Docker Compose gives a reproducible local setup and avoids asking developers to manually install PostgreSQL, Neo4j, Valkey, OPA, backend dependencies, and frontend dependencies.

## 7. Database Design

The relational model is centered around tenant-scoped providers and findings.

Core relationships:

```text
User
  |
  v
UserProfile --> Tenant
                 |
                 v
              Provider
                 |
                 v
           InventoryRun
                 |
                 v
              Finding

Tenant also owns CustomRule, IaCFinding, and DeepScan.
ResourceConfig and ResourceStateHash store resource state by account and ARN.
```

Design notes:

- `Provider` belongs to a tenant because each workspace can connect different AWS accounts.
- `InventoryRun` belongs to a provider and tenant so scan history is traceable.
- `Finding` stores both normalized fields and raw policy output so the UI can filter quickly while still preserving detailed evidence.
- `CustomRule` is tenant-scoped so teams can define their own policies.
- `ResourceConfig` uses JSON because AWS service configurations are not uniform.
- `ResourceStateHash` uses account ID and ARN as a unique pair to detect changes.

## 8. Security Architecture

Security decisions in the project include:

- Token-authenticated API access.
- Tenant-scoped queries.
- Read-only AWS role assumption.
- No direct browser-to-AWS access.
- Temporary repository clone directories for IaC scans.
- Cleanup after repository scans.
- OPA-based policy evaluation.
- Suppression instead of deletion for accepted cloud findings.
- Separate graph snapshot update tags to avoid stale data leakage.

Areas to strengthen before production:

- Replace simple token auth with JWT rotation or OIDC/SAML for enterprise use.
- Store secrets in a secret manager instead of `.env` files.
- Add stricter `ALLOWED_HOSTS` instead of `["*"]`.
- Add production CORS settings.
- Add audit logs for suppression, custom rule edits, and provider changes.
- Add encryption for sensitive database fields if required.
- Validate and sandbox custom Rego more strictly.
- Harden repository clone URLs to prevent abuse.
- Add rate limiting to API endpoints.
- Use production WSGI/ASGI servers instead of Django development server.

## 9. Deployment Architecture

The local deployment is defined in `docker-compose.yml`.

Services:

- `db`: PostgreSQL 15.
- `valkey`: Redis-compatible broker.
- `neo4j`: Neo4j 5 Community.
- `backend`: Django API on port 8000.
- `celery`: inventory worker.
- `celery-beat`: scheduled task runner.
- `celery-deep-scan`: deep scan worker.
- `opa`: Open Policy Agent server on port 8181.
- `frontend`: React/Vite app on port 3000.

Why separate containers:

Containers mirror the real boundaries of the system. This makes local development closer to production architecture and allows each component to be restarted independently.

Important ports:

- Frontend: `3000`
- Backend API: `8000`
- OPA: `8181`
- Neo4j browser: `7474`
- Neo4j Bolt: `7687`
- Valkey: `6379`
- IaC Flask backend: `5000` when run separately

## 10. Compliance Coverage

The project maps findings to security and compliance frameworks such as:

- CIS AWS Foundations Benchmark.
- DPDP.
- RBI security expectations.
- SEBI/SBE-style cyber hygiene checks.

Why compliance mappings were included:

Security teams often need to report not only technical issues but also framework impact. Mapping findings to frameworks helps with audits, reports, prioritization, and stakeholder communication.

## 11. Reporting

Reporting exists in multiple places:

- Frontend report export helpers.
- Flask IaC backend PDF/CSV export.
- CLI PDF/CSV export.

Why reporting is important:

Security scan results need to be shared with developers, auditors, managers, and operations teams. Exportable reports turn dashboard data into portable evidence and remediation plans.

## 12. Known Tradeoffs

### 12.1 Development Server in Docker

The backend Dockerfile runs Django's development server, and the frontend runs Vite dev server.

Tradeoff:

This is convenient for local development but should be replaced with production-grade serving for deployment, such as Gunicorn/Uvicorn for Django and a static web server or CDN for frontend assets.

### 12.2 OPA Runtime Dependency

Rule evaluation depends on the OPA service being available.

Tradeoff:

OPA gives clean policy separation, but it adds another service dependency. The code partially mitigates this by storing configs and re-evaluating resources that previously produced no findings.

### 12.3 Duplicate IaC Scan Paths

The repository includes both Django-integrated IaC scanning and a standalone Flask IaC backend.

Tradeoff:

This offers flexibility, but it can cause duplicated logic. Long term, the project should choose one primary IaC scanning path or share common scanning/reporting modules.

### 12.4 Resource Explorer Dependency

Inventory discovery depends heavily on AWS Resource Explorer.

Tradeoff:

Resource Explorer simplifies discovery, but it requires setup and may not surface every resource immediately. The project includes fallback ideas such as optional S3 discovery and AWS Config drift signals.

### 12.5 Custom Rules Need Guardrails

Custom Rego rules are powerful.

Tradeoff:

They increase flexibility, but malformed or expensive policies can affect evaluation. Production use should include validation, timeouts, and policy review workflows.

## 13. Suggested Future Improvements

- Add automated tests for inventory fetchers and rule evaluation.
- Add frontend tests for authentication, scan flow, and findings filters.
- Add CI workflow for backend linting, frontend build, and policy validation.
- Add structured audit logs.
- Add stronger production authentication.
- Add cloud provider abstraction for Azure/GCP.
- Add service coverage beyond S3, EC2, IAM, RDS, KMS, and CloudTrail.
- Add severity scoring based on graph context.
- Add historical trend charts.
- Add Slack/Jira integrations for findings.
- Add custom rule validation UI.
- Add SARIF export for IaC findings.
- Add Kubernetes deployment manifests or Helm chart.

## 14. Summary

CloudSecure is designed as a practical CSPM platform with four connected capabilities:

1. Runtime AWS posture scanning.
2. Policy-as-code compliance evaluation.
3. Graph-based attack-path analysis.
4. Terraform/IaC scanning with remediation support.

The architecture uses Django and PostgreSQL for durable application state, Celery and Valkey for asynchronous work, boto3 and STS for safe AWS access, OPA/Rego for security rules, Neo4j for relationship analysis, React for the dashboard, Flask and CLI tooling for IaC workflows, and Docker Compose for reproducible local orchestration.

The main design theme is separation of concerns. The UI remains responsive, scans run in background workers, policies are separated from Python code, graph analysis is handled by a graph database, and cloud access is read-only through temporary assumed roles. This makes the project easier to extend, safer to operate, and better aligned with how real CSPM systems are built.
