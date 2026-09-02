import type { ExecutionResult } from "../types/code";

interface RunCodeApiResponse {
  status: "success" | "error";
  output?: string;
  message?: string;
}

export async function executeCode(code: string): Promise<ExecutionResult> {
  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const body = (await response.json()) as RunCodeApiResponse;

    if (!response.ok || body.status !== "success") {
      return { success: false, error: body.message ?? "Something went wrong" };
    }

    return { success: true, output: body.output };
  } catch {
    return {
      success: false,
      error: "Unable to connect to the execution service.",
    };
  }
}
