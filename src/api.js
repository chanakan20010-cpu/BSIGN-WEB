let csrf = "";
export async function api(url, options = {}) {
  const isForm = options.body instanceof FormData;
  const response = await fetch("/api" + url, {
    ...options,
    headers: {
      ...(options.body && !isForm
        ? { "Content-Type": "application/json" }
        : {}),
      ...(options.method ? { "X-CSRF-Token": csrf } : {}),
      ...options.headers,
    },
    body: options.body
      ? isForm
        ? options.body
        : JSON.stringify(options.body)
      : undefined,
  });
  const data = await response.json();
  if (data.csrf) csrf = data.csrf;
  if (!response.ok) throw new Error(data.error || "REQUEST_FAILED");
  return data;
}
