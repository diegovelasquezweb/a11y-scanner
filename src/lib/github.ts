import JSZip from "jszip";

const API = "https://api.github.com";

function cfg() {
  const token = process.env.GH_TOKEN;
  const owner = process.env.GH_OWNER;
  const repo = process.env.GH_REPO;
  if (!token || !owner || !repo) {
    throw new Error("Missing GitHub env vars: GH_TOKEN, GH_OWNER, GH_REPO");
  }
  return {
    token,
    owner,
    repo,
    workflowFile: process.env.GH_WORKFLOW_FILE ?? "scan.yml",
    ref: process.env.GH_WORKFLOW_REF ?? "main",
  };
}

function ghHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

interface EngineSelection {
  axe?: boolean;
  cdp?: boolean;
  pa11y?: boolean;
}

export async function triggerScan(params: {
  scanToken: string;
  targetUrl: string;
  githubRepoUrl?: string;
  axeTags?: string[];
  engines?: EngineSelection;
}): Promise<void> {
  const { token, owner, repo, workflowFile, ref } = cfg();

  const inputs: Record<string, string> = {
    scan_token: params.scanToken,
    target_url: params.targetUrl,
  };
  if (params.githubRepoUrl) inputs.github_repo_url = params.githubRepoUrl;
  if (params.axeTags?.length) inputs.axe_tags = params.axeTags.join(",");
  if (params.engines) {
    const active = Object.entries(params.engines)
      .filter(([, v]) => v !== false)
      .map(([k]) => k);
    if (active.length < 3) inputs.engines = active.join(",");
  }

  const res = await fetch(
    `${API}/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`,
    {
      method: "POST",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ ref, inputs }),
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
  const { token, owner, repo, workflowFile } = cfg();
  const runName = `scan-${scanToken}`;

  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const url = `${API}/repos/${owner}/${repo}/actions/workflows/${workflowFile}/runs?per_page=20&created=>=${since}`;

  const res = await fetch(url, { headers: ghHeaders(token), cache: "no-store" });
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

  const jobsRes = await fetch(
    `${API}/repos/${owner}/${repo}/actions/runs/${run.id}/jobs`,
    { headers: ghHeaders(token), cache: "no-store" }
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
  const { token, owner, repo } = cfg();
  const artifactName = `scan-${scanToken}`;

  const res = await fetch(
    `${API}/repos/${owner}/${repo}/actions/artifacts?per_page=100&name=${encodeURIComponent(artifactName)}`,
    { headers: ghHeaders(token), cache: "no-store" }
  );

  if (!res.ok) return null;

  const { artifacts } = (await res.json()) as {
    artifacts: Array<{ id: number; name: string; expired: boolean }>;
  };

  const artifact = artifacts
    .filter((a) => a.name === artifactName && !a.expired)
    .sort((a, b) => b.id - a.id)[0];
  if (!artifact) return null;

  const dlRes = await fetch(
    `${API}/repos/${owner}/${repo}/actions/artifacts/${artifact.id}/zip`,
    { headers: ghHeaders(token) }
  );

  if (!dlRes.ok) return null;

  const zipBuffer = Buffer.from(await dlRes.arrayBuffer());
  const zip = await JSZip.loadAsync(zipBuffer);

  const normalize = (value: string) => value.replace(/^\.\//, "").replace(/^\//, "");
  const normalizedFilename = normalize(filename);

  let file = zip.file(normalizedFilename);
  if (!file) {
    file = zip.file(filename);
  }
  if (!file) {
    const allFiles = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
    const bySuffix = allFiles.filter(
      (name) => normalize(name) === normalizedFilename || normalize(name).endsWith(`/${normalizedFilename}`)
    );
    if (bySuffix.length === 1) {
      file = zip.file(bySuffix[0]) ?? null;
    }
  }
  if (!file) return null;

  return Buffer.from(await file.async("arraybuffer"));
}
