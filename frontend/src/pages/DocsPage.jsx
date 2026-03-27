import { useState } from "react";
import { Link } from "react-router-dom";

const sections = [
  {
    id: "overview",
    title: "Overview",
    content: (
      <>
        <p>
          CloudSecure is an open-source <strong>Cloud Security Posture Management (CSPM)</strong> platform
          that continuously scans your AWS environment, detects misconfigurations, maps attack paths,
          and produces actionable compliance findings — all from a single self-hosted dashboard.
        </p>
        <p className="mt-3">
          It scans 6 AWS services, evaluates resources against Rego policy files powered by OPA,
          and maps findings to 4 compliance frameworks with actionable remediation guidance for every issue.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { val: "350+", label: "Security Checks" },
            { val: "6", label: "AWS Services" },
            { val: "4", label: "Frameworks" },
            { val: "<5min", label: "First Scan" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-center">
              <p className="text-xl font-bold text-emerald-400">{s.val}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "architecture",
    title: "Architecture",
    content: (
      <>
        <p>CloudSecure uses a modern, event-driven microservices architecture:</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Component</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Technology</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {[
                ["Frontend", "React 18 + Vite + TailwindCSS", "Dashboard, findings, reports UI"],
                ["Backend API", "Django 4 + DRF", "REST API, authentication, tenant isolation"],
                ["Task Queue", "Celery + Valkey (Redis)", "Async inventory pulls and rule evaluation"],
                ["Policy Engine", "OPA (Open Policy Agent)", "Rego-based rule evaluation"],
                ["Primary DB", "PostgreSQL 15", "Users, providers, findings, resource configs"],
                ["Graph DB", "Neo4j 5", "Resource relationship mapping and attack paths"],
                ["Cloud SDK", "boto3 (AWS SDK)", "AWS API calls via STS AssumeRole"],
              ].map(([comp, tech, purpose]) => (
                <tr key={comp}>
                  <td className="px-3 py-2 font-medium text-emerald-400">{comp}</td>
                  <td className="px-3 py-2 text-slate-300">{tech}</td>
                  <td className="px-3 py-2 text-slate-400">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-5 font-mono text-xs leading-relaxed text-slate-400">
          <p className="mb-2 text-sm font-semibold text-emerald-400">Scan Workflow</p>
          <p>1. User triggers scan → POST /api/v1/providers/&lt;id&gt;/inventory-pull/</p>
          <p>2. Celery task queued → perform_inventory_pull_task</p>
          <p>3. AssumeRole into target AWS account via STS</p>
          <p>4. Query Resource Explorer + fetch detailed configs via boto3</p>
          <p>5. Hash resource state for delta change detection</p>
          <p>6. Store in PostgreSQL (ResourceConfig) + Neo4j (graph)</p>
          <p>7. For each resource: build OPA input → evaluate Rego rules</p>
          <p>8. Create/update Finding records with severity + remediation</p>
          <p>9. Re-evaluate any resource with zero findings (recovery fallback)</p>
          <p>10. Frontend polls for completion → displays results</p>
        </div>
      </>
    ),
  },
  {
    id: "services",
    title: "Supported AWS Services",
    content: (
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { name: "Amazon S3", checks: "Public access blocks, encryption, versioning, logging, bucket policies, ACLs, cross-account access" },
          { name: "Amazon EC2", checks: "Security groups, open ports, IMDSv2, public IPs, instance profile, VPC membership" },
          { name: "AWS IAM", checks: "MFA enforcement, inline policies, role trust policies, unused access keys, overly permissive roles" },
          { name: "Amazon RDS", checks: "Encryption at rest, public accessibility, backup retention, deletion protection, multi-AZ" },
          { name: "AWS KMS", checks: "Key rotation, key policies, key manager, multi-region keys" },
          { name: "AWS CloudTrail", checks: "Multi-region logging, log file validation, CloudWatch integration, S3 delivery, KMS encryption" },
        ].map((svc) => (
          <div key={svc.name} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h4 className="font-semibold text-white">{svc.name}</h4>
            <p className="mt-1 text-xs text-slate-400">{svc.checks}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "frameworks",
    title: "Compliance Frameworks",
    content: (
      <>
        <p>CloudSecure maps every finding to one or more compliance frameworks:</p>
        <div className="mt-4 space-y-3">
          {[
            {
              name: "CIS AWS Foundations Benchmark",
              tag: "CIS",
              desc: "Industry-standard security configuration guidelines from the Center for Internet Security. Covers identity, logging, monitoring, and networking controls.",
            },
            {
              name: "India DPDP Act 2023",
              tag: "DPDP",
              desc: "Digital Personal Data Protection Act compliance. Focuses on data encryption, access controls, and data handling requirements for organizations processing Indian citizens' data.",
            },
            {
              name: "RBI Cyber Security Framework",
              tag: "RBI",
              desc: "Reserve Bank of India cybersecurity framework for financial institutions. Covers data protection, access management, and infrastructure security requirements.",
            },
            {
              name: "SBE / SEBI Cyber Hygiene",
              tag: "SBE",
              desc: "SEBI Basic Cyber Hygiene and CERT-In advisory compliance. Covers vulnerability management, logging, encryption, and incident response readiness.",
            },
          ].map((fw) => (
            <div key={fw.tag} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-400">{fw.tag}</span>
                <h4 className="font-semibold text-white">{fw.name}</h4>
              </div>
              <p className="mt-2 text-sm text-slate-400">{fw.desc}</p>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "quickstart",
    title: "Quick Start Guide",
    content: (
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h4 className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">1</span>
            Prerequisites
          </h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-400">
            <li>— Docker Desktop installed and running</li>
            <li>— AWS CLI configured on your host (<code className="rounded bg-slate-700 px-1 text-emerald-400">aws configure</code>)</li>
            <li>— An AWS account where you can create IAM roles</li>
          </ul>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h4 className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">2</span>
            Clone & Configure
          </h4>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
{`git clone <repo-url>
cd cloud-secure-kaalitopi
cp .env.example .env
# Edit .env with the values below`}
          </pre>
          <p className="mt-3 text-xs font-semibold text-slate-400">Required .env variables:</p>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-2 py-1.5 text-left text-slate-500">Variable</th>
                  <th className="px-2 py-1.5 text-left text-slate-500">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {[
                  ["SECRET_KEY", "python -c \"import secrets; print(secrets.token_urlsafe(50))\""],
                  ["POSTGRES_DB", "cloudsecure"],
                  ["POSTGRES_USER", "cloudsecure"],
                  ["POSTGRES_PASSWORD", "localpostgres123"],
                  ["POSTGRES_HOST", "db"],
                  ["POSTGRES_PORT", "5432"],
                  ["VALKEY_URL", "redis://valkey:6379/0"],
                  ["NEO4J_URI", "bolt://neo4j:7687"],
                  ["NEO4J_USER", "neo4j"],
                  ["NEO4J_PASSWORD", "localneo4j123"],
                  ["DJANGO_SETTINGS_MODULE", "cloudsecure.settings.local"],
                  ["AWS_DEFAULT_REGION", "us-east-1"],
                  ["DEBUG", "True"],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <td className="px-2 py-1.5 font-mono text-emerald-400">{k}</td>
                    <td className="px-2 py-1.5 text-slate-400">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h4 className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">3</span>
            Start the App
          </h4>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
{`docker compose up -d --build
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser`}
          </pre>
          <p className="mt-2 text-xs text-slate-400">Open <span className="text-emerald-400">http://localhost:3000</span> and sign in with the superuser credentials.</p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h4 className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">4</span>
            AWS IAM Role Setup
          </h4>
          <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
{`# Get your Account ID
aws sts get-caller-identity --query Account --output text

# Enable Resource Explorer (must be us-east-1)
aws resource-explorer-2 create-index --type AGGREGATOR --region us-east-1

# Verify index is ACTIVE (may take several minutes to over an hour)
aws resource-explorer-2 get-index --region us-east-1

# Create the IAM role
aws iam create-role \\
  --role-name CloudSecureRole \\
  --assume-role-policy-document file://trust-policy.json

# Attach permissions
aws iam put-role-policy \\
  --role-name CloudSecureRole \\
  --policy-name CloudSecurePermissions \\
  --policy-document file://permissions-policy.json`}
          </pre>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm text-emerald-400 hover:text-emerald-300">
              View required IAM permissions
            </summary>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
{`{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "resource-explorer-2:Search",
      "resource-explorer-2:GetIndex",
      "resource-explorer-2:GetDefaultView",
      "resource-explorer-2:ListViews",
      "s3:GetBucketPolicy", "s3:GetBucketAcl",
      "s3:GetBucketEncryption", "s3:GetBucketVersioning",
      "s3:GetBucketLogging", "s3:GetPublicAccessBlock",
      "ec2:DescribeInstances", "ec2:DescribeSecurityGroups",
      "iam:GetRole", "iam:GetUser",
      "iam:ListRolePolicies", "iam:GetRolePolicy",
      "iam:ListUserPolicies", "iam:GetUserPolicy",
      "iam:ListMFADevices",
      "rds:DescribeDBInstances",
      "kms:DescribeKey", "kms:GetKeyPolicy",
      "kms:GetKeyRotationStatus",
      "cloudtrail:DescribeTrails",
      "cloudtrail:GetTrailStatus",
      "cloudtrail:GetEventSelectors",
      "sts:GetCallerIdentity"
    ],
    "Resource": "*"
  }]
}`}
            </pre>
          </details>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
          <h4 className="flex items-center gap-2 font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">5</span>
            Run Your First Scan
          </h4>
          <ol className="mt-2 space-y-1 text-sm text-slate-400">
            <li>1. Go to <strong className="text-white">Connect</strong> → enter your AWS Account ID and role name <code className="rounded bg-slate-700 px-1 text-emerald-400">CloudSecureRole</code></li>
            <li>2. Click <strong className="text-white">Test Connection</strong> — green check means the role works</li>
            <li>3. Go to <strong className="text-white">Scan</strong> → click <strong className="text-white">Scan Now</strong></li>
            <li>4. View results in <strong className="text-white">Dashboard</strong> and <strong className="text-white">Findings</strong></li>
            <li>5. Export compliance reports from <strong className="text-white">Reports</strong></li>
          </ol>
        </div>
      </div>
    ),
  },
  {
    id: "commands",
    title: "Useful Commands",
    content: (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Command</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {[
                ["docker compose up -d --build", "Build images and start all services"],
                ["docker compose up -d", "Start all services (no rebuild)"],
                ["docker compose down", "Stop all services"],
                ["docker compose down -v", "Stop all services and delete volumes"],
                ["docker compose restart backend", "Restart only the backend"],
                ["docker compose restart celery", "Restart only the Celery worker"],
                ["docker compose restart frontend", "Restart only the frontend"],
                ["docker compose exec backend python manage.py migrate", "Run database migrations"],
                ["docker compose exec backend python manage.py createsuperuser", "Create an admin user"],
                ["docker compose logs -f backend", "Tail backend logs"],
                ["docker compose logs -f celery", "Tail Celery worker logs"],
                ["docker compose logs -f", "Tail all service logs"],
                ["docker compose ps", "Show status of all containers"],
                ["docker compose exec backend python manage.py shell", "Open Django shell"],
              ].map(([cmd, desc]) => (
                <tr key={cmd}>
                  <td className="px-3 py-2 font-mono text-xs text-emerald-400">{cmd}</td>
                  <td className="px-3 py-2 text-slate-400">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ),
  },
  {
    id: "api",
    title: "API Reference",
    content: (
      <>
        <p>CloudSecure exposes a RESTful API. All endpoints require <code className="rounded bg-slate-700 px-1 text-emerald-400">Authorization: Token &lt;token&gt;</code> unless marked public.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Method</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Endpoint</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-slate-500">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {[
                ["POST", "/api/auth/register/", "Create new account (public)"],
                ["POST", "/api/auth/login/", "Login, returns token (public)"],
                ["POST", "/api/auth/logout/", "Invalidate token"],
                ["GET", "/api/auth/me/", "Current user info"],
                ["GET", "/api/v1/providers/", "List connected AWS providers"],
                ["POST", "/api/v1/providers/", "Add new AWS provider"],
                ["POST", "/api/v1/providers/:id/test-connection/", "Test AWS IAM role connection"],
                ["POST", "/api/v1/providers/:id/inventory-pull/", "Trigger async scan"],
                ["GET", "/api/v1/providers/:id/inventory-runs/", "List scan runs"],
                ["GET", "/api/v1/providers/:id/findings/", "List findings (filterable by severity, status, type)"],
                ["GET", "/api/v1/providers/:id/findings/summary/", "Findings summary by severity/framework"],
                ["PATCH", "/api/v1/findings/:id/suppress/", "Suppress a finding"],
                ["GET", "/api/v1/providers/:id/graph/", "Neo4j graph data (nodes + edges)"],
              ].map(([method, path, desc]) => (
                <tr key={path}>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        method === "GET"
                          ? "bg-blue-500/10 text-blue-400"
                          : method === "POST"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {method}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-300">{path}</td>
                  <td className="px-3 py-2 text-slate-400">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    content: (
      <div className="space-y-3">
        {[
          {
            q: "Findings not appearing after scan",
            a: "This is usually caused by three issues working together. (1) OPA unreachable: ensure OPA_URL: http://opa:8181 is set in docker-compose.yml for backend and celery, and opa is listed under depends_on. Without this, Celery starts before OPA is ready and policy loading fails silently. (2) Resource type mappings: the rule engine must map all Resource Explorer short-form types (s3:bucket, ec2:instance, rds:db, kms:key, cloudtrail:trail). (3) Delta scan trap: if a first scan discovered resources but generated no findings, subsequent scans skip them as unchanged. The re-evaluation fallback will automatically force-evaluate any resource with zero findings on the next scan.",
          },
          {
            q: "NoCredentialError on test-connection",
            a: "The backend container needs AWS credentials. The docker-compose.yml mounts ~/.aws from your host into the container. Run aws configure on your machine first, or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.",
          },
          {
            q: "Resource Explorer index not found",
            a: "Run: aws resource-explorer-2 create-index --type AGGREGATOR --region us-east-1. Then verify with: aws resource-explorer-2 get-index --region us-east-1 — wait until State is ACTIVE (can take several minutes to over an hour). Ensure AWS_DEFAULT_REGION=us-east-1 in your .env.",
          },
          {
            q: "Password authentication failed for PostgreSQL",
            a: "The Postgres volume was initialized with a different password. Reset it: docker compose down -v && docker compose up -d && docker compose exec backend python manage.py migrate",
          },
          {
            q: "Neo4j connection refused",
            a: "Neo4j takes ~30 seconds to start. Check logs with: docker compose logs neo4j — wait for the 'Started.' message before triggering a scan.",
          },
          {
            q: "Celery not picking up tasks",
            a: "Check logs: docker compose logs -f celery. You should see 'celery@... ready'. If not, restart: docker compose restart celery. Also ensure OPA_URL is set and opa is in depends_on.",
          },
          {
            q: "Scan stuck in running state",
            a: "Check Celery worker logs: docker compose logs -f celery. Common causes: AWS rate limiting, missing IAM permissions, or Neo4j not ready. Also verify the Resource Explorer index is ACTIVE.",
          },
          {
            q: "Frontend blank page or CORS errors",
            a: "Rebuild the frontend: docker compose up -d --build frontend. Check browser console for failing API requests. Ensure VITE_API_URL=http://localhost:8000 in docker-compose.yml.",
          },
          {
            q: "Dashboard shows no data after scan",
            a: "Make sure you have connected a provider, tested the connection successfully, and run at least one scan. If the scan completed but findings are empty, see the 'Findings not appearing' entry above.",
          },
        ].map((item) => (
          <div key={item.q} className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <h4 className="font-semibold text-white">{item.q}</h4>
            <p className="mt-1 text-sm text-slate-400">{item.a}</p>
          </div>
        ))}
      </div>
    ),
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="CloudSecure" className="h-9 w-9 object-contain" />
            <span className="text-xl font-bold">CloudSecure</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm text-slate-400 hover:text-white">Home</Link>
            <Link
              to="/login"
              className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
            >
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto flex max-w-7xl gap-8 px-6 py-10">
        {/* Sidebar nav */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Documentation</p>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSection(s.id);
                  document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeSection === s.id
                    ? "bg-emerald-500/10 font-medium text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <h1 className="mb-2 text-3xl font-bold">Documentation</h1>
          <p className="mb-10 text-slate-400">
            Everything you need to know about setting up and using CloudSecure.
          </p>

          <div className="space-y-16">
            {sections.map((s) => (
              <section key={s.id} id={s.id}>
                <h2 className="mb-4 text-xl font-bold text-white">{s.title}</h2>
                <div className="text-sm leading-relaxed text-slate-300">{s.content}</div>
              </section>
            ))}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="CloudSecure" className="h-7 w-7 object-contain" />
              <span className="font-semibold">CloudSecure</span>
            </div>
            <p className="text-sm text-slate-500">
              Built by Team Kaalitopi · Cloud Security Scanner
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
