import path from "node:path";
import os from "node:os";

export const SCANS_DIR = path.join(os.tmpdir(), "a11y-scans");

export function getScanPath(scanId: string, ext: string): string {
  return path.join(SCANS_DIR, `${scanId}.${ext}`);
}

export function getScreenshotsDir(scanId: string): string {
  return path.join(SCANS_DIR, `${scanId}.screenshots`);
}
