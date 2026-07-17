import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Request } from "express";
import { readMediaBody } from "../lib/http";

export const uploadsDirectory = fileURLToPath(new URL("../../uploads/", import.meta.url));

export class MediaService {
  async storeVideo(request: Request) {
    const contentType = request.header("content-type")?.split(";")[0] ?? "";
    if (!["video/webm", "video/mp4"].includes(contentType)) return { error: "UNSUPPORTED_MEDIA" as const };
    try {
      const body = await readMediaBody(request);
      if (!body.length) return { error: "EMPTY_MEDIA" as const };
      const extension = contentType === "video/mp4" ? "mp4" : "webm";
      const filename = `${crypto.randomUUID()}.${extension}`;
      await mkdir(uploadsDirectory, { recursive: true });
      await writeFile(`${uploadsDirectory}/${filename}`, body);
      return { mediaUrl: `/uploads/${filename}` };
    } catch (cause) {
      if (cause instanceof Error && cause.message === "MEDIA_TOO_LARGE") return { error: "MEDIA_TOO_LARGE" as const };
      throw cause;
    }
  }
}

export const mediaService = new MediaService();
