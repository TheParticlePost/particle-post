import fs from "fs";
import path from "path";

export async function GET() {
  const llmsPath = path.join(process.cwd(), "blog", "static", "llms.txt");

  if (!fs.existsSync(llmsPath)) {
    return new Response("Not found", { status: 404 });
  }

  const content = fs.readFileSync(llmsPath, "utf-8");
  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400",
    },
  });
}
