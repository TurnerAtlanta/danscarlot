export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function error(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}
