import JSZip from "jszip";

const GH_TOKEN = process.env.GH_TOKEN!;
const GH_OWNER = process.env.GH_OWNER!;
const GH_REPO = process.env.GH_REPO!;
const GH_WORKFLOW_FILE = process.env.GH_WORKFLOW_FILE ?? "scan.yml";
const GH_WORKFLOW_REF = process.env.GH_WORKFLOW_REF ?? "main";

const API = "https://api.github.com";

function ghHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${GH_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function triggerScan(params: {
  scanToken: string;
  targetUrl: string;
  githubRepoUrl?: string;
  axeTags?: string[];
}): Promise<void> {
  const inputs: Record<string, string> = {
    scan_token: params.scanToken,
    target_url: params.targetUrl,
  };
  if (params.githubRepoUrl) inputs.github_repo_url = params.githubRepoUrl;
  if (params.axeTags?.length) inputs.axe_tags = params.axeTags.join(",");

  const res = await fetch(
    `${API}/repos/${GH_OWNER}/${GH_REPO}/actions/workflows/${GH_WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ ref: GH_WORKFLOW_REF, inputs }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub workflow_dispatch failed: ${res.status} ${text}`);
  }
}

export interface WorkflowRunStatus {
  status: "queued" | "in_progress" | "completed" | "not_found";
  conclusion: string | null;
  steps: WorkflowStepStatus[];
  runId: number | null;
}

export interface WorkflowStepStatus {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  number: number;
}

export async function getRunStatus(scanToken: string): Promise<WorkflowRunStatus> {
  const runName = `scan-${scanToken}`;

  // List recent runs for this workflow (created in last 10 minutes)
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const url = `${API}/repos/${GH_OWNER}/${GH_REPO}/actions/workflows/${GH_WORKFLOW_FILE}/runs?per_page=20&created=>=${since}`;

  const res = await fetch(url, { headers: ghHeaders(), cache: "no-store" });
  if (!res.ok) {
    return { status: "not_found", conclusion: null, steps: [], runId: null };
  }

  const { workflow_runs } = (await res.json()) as {
    workflow_runs: Array<{
      id: number;
      name: string;
      status: string;
      conclusion: string | null;
    }>;
  };

  const run = workflow_runs.find((r) => r.name === runName);
  if (!run) {
    return { status: "not_found", conclusion: null, steps: [], runId: null };
  }

  // Fetch job steps for this run
  const jobsRes = await fetch(
    `${API}/repos/${GH_OWNER}/${GH_REPO}/actions/runs/${run.id}/jobs`,
    { headers: ghHeaders(), cache: "no-store" }
  );

  let steps: WorkflowStepStatus[] = [];
  if (jobsRes.ok) {
    const { jobs } = (await jobsRes.json()) as {
      jobs: Array<{
        steps?: Array<{
          name: string;
          status: string;
          conclusion: string | null;
          number: number;
        }>;
      }>;
    };
    const job = jobs[0];
    if (job?.steps) {
      steps = job.steps.map((s) => ({
        name: s.name,
        status: s.status as WorkflowStepStatus["status"],
        conclusion: s.conclusion,
        number: s.number,
      }));
    }
  }

  return {
    status: run.status as WorkflowRunStatus["status"],
    conclusion: run.conclusion,
    steps,
    runId: run.id,
  };
}

export async function getArtifactFile(
  scanToken: string,
  filename: string
): Promise<Buffer | null> {
  const artifactName = `scan-${scanToken}`;

  // List artifacts for the repo
  const res = await fetch(
    `${API}/repos/${GH_OWNER}/${GH_REPO}/actions/artifacts?per_page=100&name=${encodeURIComponent(artifactName)}`,
    { headers: ghHeaders(), cache: "no-store" }
  );

  if (!res.ok) return null;

  const { artifacts } = (await res.json()) as {
    artifacts: Array<{ id: number; name: string; expired: boolean }>;
  };

  const artifact = artifacts.find((a) => a.name === artifactName && !a.expired);
  if (!artifact) return null;

  // Download the ZIP
  const dlRes = await fetch(
    `${API}/repos/${GH_OWNER}/${GH_REPO}/actions/artifacts/${artifact.id}/zip`,
    { headers: ghHeaders() }
  );

  if (!dlRes.ok) return null;

  const zipBuffer = Buffer.from(await dlRes.arrayBuffer());
  const zip = await JSZip.loadAsync(zipBuffer);

  const file = zip.file(filename);
  if (!file) return null;

  return Buffer.from(await file.async("arraybuffer"));
}
