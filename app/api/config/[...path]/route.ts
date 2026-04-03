import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/api-auth";
import {
  readConfigFromGitHub,
  writeConfigToGitHub,
  isAllowedConfigPath,
} from "@/lib/config-writer";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const filepath = path.join("/");

  if (!isAllowedConfigPath(filepath)) {
    return NextResponse.json(
      { error: `Access denied: ${filepath}` },
      { status: 403 }
    );
  }

  try {
    const { data } = await readConfigFromGitHub(filepath);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to read config: ${err}` },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  if (!(await verifyAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path } = await params;
  const filepath = path.join("/");

  if (!isAllowedConfigPath(filepath)) {
    return NextResponse.json(
      { error: `Access denied: ${filepath}` },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { data, message } = body;

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "data object required" },
        { status: 400 }
      );
    }

    const commitMsg =
      message || `dashboard: update ${filepath.split("/").pop()}`;
    const { commitSha } = await writeConfigToGitHub(filepath, data, commitMsg);

    return NextResponse.json({ success: true, commitSha });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to write config: ${err}` },
      { status: 500 }
    );
  }
}
