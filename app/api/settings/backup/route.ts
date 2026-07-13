import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function POST() {
  const scriptPath = path.join(process.cwd(), "scripts", "backup.sh");
  try {
    const { stdout } = await execFileAsync("bash", [scriptPath]);
    return NextResponse.json({ ok: true, output: stdout });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
