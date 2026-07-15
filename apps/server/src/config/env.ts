export const env = {
  port: Number(process.env.PORT ?? 3001),
  allowDevCheat: process.env.NODE_ENV !== "production" || process.env.ALLOW_DEV_CHEAT === "true",
  transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL ?? "whisper-1",
};
