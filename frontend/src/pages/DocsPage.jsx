import { useState } from "react";
import { Link } from "react-router-dom";

const sections = [
  {
    id: "overview",
    title: "Overview",
    content: (
      <>
        <p>
          CloudSecure is a <strong>Cloud Security Posture Management (CSPM)</strong> tool
          that continuously audits your AWS infrastructure configurations and detects
          security misconfigurations against industry benchmarks.
        </p>
        <p className="mt-3">
          It scans 7 AWS services, evaluates resources against 12 Rego policy files,
          and maps findings to 4 compliance frameworks — with actionable remediation
          guidance for every issue found.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { val: "350+", label: "Security Checks" },
            { val: "7", label: "AWS Services" },
            { val: "12", label: "Rego Policies" },
            { val: "4", label: "Frameworks" },
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
                ["Backend API", "Django + DRF", "REST API, authentication, tenant isolation"],
                ["Task Queue", "Celery + Valkey (Redis)", "Async inventory pulls and rule evaluation"],
                ["Policy Engine", "OPA (Open Policy Agent)", "Rego-based rule evaluation"],
                ["Primary DB", "PostgreSQL 15", "Users, providers, findings, resource configs"],
                ["Graph DB", "Neo4j 5", "Resource relationship mapping and topology"],
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
          <p>1. User triggers scan &rarr; POST /api/v1/providers/&lt;id&gt;/inventory-pull/</p>
          <p>2. Celery task queued &rarr; perform_inventory_pull_task</p>
          <p>3. AssumeRole into target AWS account</p>
          <p>4. Query Resource Explorer + fetch detailed configs via boto3</p>
          <p>5. Hash resource state for change detection</p>
          <p>6. Store in PostgreSQL (ResourceConfig) + Neo4j (graph)</p>
          <p>7. For each resource: build OPA input &rarr; evaluate Rego rules</p>
          <p>8. Create/update Finding records with severity + remediation</p>
          <p>9. Frontend polls for completion &rarr; displays results</p>
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
          { name: "Amazon S3", checks: "Public access blocks, encryption, versioning, logging, bucket policies, ACLs" },
          { name: "Amazon EC2", checks: "Security groups, open ports, VPC membership, instance metadata, tags" },
          { name: "AWS IAM", checks: "MFA enforcement, password policies, unused credentials, overly permissive policies" },
          { name: "Amazon RDS", checks: "Encryption at rest, public accessibility, backup configuration, security groups" },
          { name: "AWS KMS", checks: "Key rotation, key policies, key management best practices" },
          { name: "AWS CloudTrail", checks: "Multi-region logging, log file validation, event selectors, S3 delivery" },
          { name: "Security Groups", checks: "Unrestricted ingress (0.0.0.0/0), sensitive port exposure (SSH, RDP, DB)" },
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
              name: "RBI (Reserve Bank of India)",
              tag: "RBI",
              desc: "Cybersecurity framework for financial institutions. Covers data protection, access management, and infrastructure security requirements.",
            },
            {
              name: "SBE / CERT-In",
              tag: "SBE",
              desc: "Security best practices and CERT-In advisory compliance. Covers vulnerability management, logging, encryption, and incident response readiness.",
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
      <>
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="flex items-center gap-2 font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">1</span>
              Prerequisites
            </h4>
            <ul className="mt-2 space-y-1 text-sm text-slate-400">
              <li>- Docker and Docker Compose installed</li>
              <li>- AWS CLI configured on your host (~/.aws credentials)</li>
              <li>- An AWS account where you can create IAM roles</li>
            </ul>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="flex items-center gap-2 font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">2</span>
              Installation
            </h4>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
{`git clone <repo-url>
cd cloud-secure-kaalitopi
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, NEO4J_PASSWORD, SECRET_KEY

docker compose up -d --build
docker compose exec backend python manage.py migrate
# Open http://localhost:3000 and sign up`}
            </pre>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="flex items-center gap-2 font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">3</span>
              AWS IAM Role Setup
            </h4>
            <ol className="mt-2 space-y-1 text-sm text-slate-400">
              <li>1. Go to AWS IAM Console &rarr; Create Role</li>
              <li>2. Trusted entity: "Another AWS account" &rarr; enter your CloudSecure account ID</li>
              <li>3. Attach the custom permission policy (see below)</li>
              <li>4. Name the role <code className="rounded bg-slate-700 px-1 text-emerald-400">CloudSecureRole</code></li>
            </ol>
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
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">4</span>
              Enable Resource Explorer
            </h4>
            <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-xs text-slate-300">
{`aws resource-explorer-2 create-index \\
  --type AGGREGATOR --region us-east-1`}
            </pre>
          </div>

          <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
            <h4 className="flex items-center gap-2 font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">5</span>
              Run Your First Scan
            </h4>
            <ol className="mt-2 space-y-1 text-sm text-slate-400">
              <li>1. Go to <strong>Connect</strong> and add your AWS Account ID + role name</li>
              <li>2. Click <strong>Test Connection</strong> to verify access</li>
              <li>3. Go to <strong>Scan</strong> and click <strong>Scan Now</strong></li>
              <li>4. View results in <strong>Dashboard</strong> and <strong>Findings</strong></li>
              <li>5. Export compliance reports from <strong>Reports</strong></li>
            </ol>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "api",
    title: "API Reference",
    content: (
      <>
        <p>CloudSecure exposes a RESTful API. All endpoints require Token authentication unless marked public.</p>
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
                ["GET", "/api/v1/providers/", "List connected providers"],
                ["POST", "/api/v1/providers/", "Add new AWS provider"],
                ["POST", "/api/v1/providers/:id/test-connection/", "Test AWS IAM role connection"],
                ["POST", "/api/v1/providers/:id/inventory-pull/", "Trigger async scan"],
                ["GET", "/api/v1/providers/:id/inventory-runs/", "List scan runs"],
                ["GET", "/api/auth/providers/:id/inventory-summary/", "Resource count summary"],
                ["GET", "/api/auth/providers/:id/graph/", "Neo4j graph data (nodes + edges)"],
                ["GET", "/api/v1/providers/:id/findings/", "List findings (filterable)"],
                ["GET", "/api/v1/providers/:id/findings/summary/", "Findings summary by severity/type"],
                ["PATCH", "/api/v1/findings/:id/suppress/", "Suppress a finding"],
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
            q: "NoCredentialError on test-connection",
            a: "The backend container needs AWS credentials. Mount ~/.aws into the container (default in docker-compose.yml), or set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file.",
          },
          {
            q: "Resource Explorer index not found",
            a: 'Run: aws resource-explorer-2 create-index --type AGGREGATOR --region us-east-1',
          },
          {
            q: "Neo4j connection refused",
            a: "Neo4j takes ~30 seconds to start. Check logs with: docker compose logs neo4j",
          },
          {
            q: "Scan stuck in 'running' state",
            a: "Check Celery worker logs: docker compose logs -f celery. Common causes: AWS rate limiting, missing permissions.",
          },
          {
            q: "Dashboard shows no data",
            a: "Make sure you've connected a provider, tested the connection, and run at least one scan.",
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
              Built by Team Kaalitopi | Cloud Misconfiguration Security Scanner
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
