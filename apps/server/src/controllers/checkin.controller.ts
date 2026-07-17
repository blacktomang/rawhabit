import type { Request, Response } from "express";
import { readMediaBody, sendError } from "../lib/http";
import { habitRepository } from "../repositories/habit.repository";
import { checkInService } from "../services/checkin.service";

export const checkInController = {
  create: async (request: Request, response: Response) => {
    const visibility = "private";
    const demoTranscript = typeof request.query.demoTranscript === "string" ? request.query.demoTranscript.trim() : "";
    const mediaUrl = typeof request.query.mediaUrl === "string" && request.query.mediaUrl.startsWith("/uploads/") ? request.query.mediaUrl : undefined;
    let media: Buffer;
    try { media = demoTranscript ? Buffer.alloc(0) : await readMediaBody(request); }
    catch (cause) { return cause instanceof Error && cause.message === "MEDIA_TOO_LARGE" ? sendError(response, 413, "Recordings must be 15 MB or smaller.", "VALIDATION_ERROR") : sendError(response, 400, "Unable to read recording.", "PROCESSING_ERROR"); }
    const job = habitRepository.createCheckInJob();
    response.status(202).json({ jobId: job.id });
    void (async () => {
      habitRepository.updateCheckInJob(job.id, "transcribing"); habitRepository.emitJobEvent(job.id, { type: "processing", data: { stage: "transcribing" } });
      const result = await checkInService.process({ media, contentType: request.header("content-type") ?? "audio/webm", visibility, demoTranscript, mediaUrl, onProgress: (type, data) => {
        if (type === "coach_ready") habitRepository.updateCheckInJob(job.id, "coaching");
        habitRepository.emitJobEvent(job.id, { type, data: data ?? {} });
      } });
      if ("error" in result) { habitRepository.updateCheckInJob(job.id, "failed", { error: result.error }); habitRepository.emitJobEvent(job.id, { type: "failed", data: { error: result.error } }); return; }
      habitRepository.updateCheckInJob(job.id, "complete", { checkInId: result.checkIn.id, result: { checkIn: result.checkIn, actionCard: result.actionCard } });
      habitRepository.emitJobEvent(job.id, { type: "complete", data: { checkIn: result.checkIn, actionCard: result.actionCard } });
    })();
  },
  getJob: (request: Request, response: Response) => {
    const job = habitRepository.getCheckInJob(request.params.id as string);
    return job ? response.json(job) : sendError(response, 404, "Check-in job not found.", "NOT_FOUND");
  },
  events: (request: Request, response: Response) => {
    const id = request.params.id as string;
    const job = habitRepository.getCheckInJob(id);
    if (!job) return sendError(response, 404, "Check-in job not found.", "NOT_FOUND");
    response.setHeader("Content-Type", "text/event-stream"); response.setHeader("Cache-Control", "no-cache"); response.setHeader("Connection", "keep-alive"); response.flushHeaders();
    const send = (type: string, data: Record<string, unknown>) => response.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    send("processing", { stage: job.status });
    if (job.status === "complete" && job.result) send("complete", job.result);
    if (job.status === "failed") send("failed", { error: job.error });
    const unsubscribe = habitRepository.subscribeToJob(id, (event) => send(event.type, event.data));
    request.on("close", unsubscribe);
  },
  publish: (request: Request, response: Response) => {
    const item = checkInService.publish(request.params.id as string);
    return item ? response.json(item) : sendError(response, 404, "Check-in not found.", "NOT_FOUND");
  },
};
