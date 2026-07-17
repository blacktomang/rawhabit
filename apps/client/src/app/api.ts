export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error((await response.json()).error ?? "Request failed");
  return response.json() as Promise<T>;
}

export async function mutate<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 25_000);

  try {
    const response = await fetch(path, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error((await response.json()).error ?? "Something went wrong");
    return response.json() as Promise<T>;
  } catch (cause) {
    if ((cause as Error).name === "AbortError") {
      throw new Error("Coaching took too long. Check that the server is running, then try again.");
    }
    if (cause instanceof TypeError) {
      throw new Error("We couldn’t reach the coaching server. Check that bun dev is running, then try again.");
    }
    throw cause;
  } finally {
    window.clearTimeout(timeout);
  }
}
