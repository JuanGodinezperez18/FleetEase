import { scanIne } from "@/lib/ocr/extract";
import { handleOcrRequest } from "@/lib/ocr/handler";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  return handleOcrRequest(req, scanIne);
}
