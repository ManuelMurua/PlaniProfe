const json = (data, status) => new Response(JSON.stringify(data), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" },
});

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  }

  if (!env.ANTHROPIC_API_KEY) return json({ error: "AI service is not configured" }, 503);

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!Array.isArray(input?.messages) || !Number.isFinite(input.max_tokens)) {
    return json({ error: "Invalid request" }, 400);
  }

  const body = {
    ...input,
    model: "claude-sonnet-4-6",
    max_tokens: Math.min(Math.max(1, Math.floor(input.max_tokens)), 6000),
  };

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return json({ error: "AI service unavailable" }, 502);
  }
}
