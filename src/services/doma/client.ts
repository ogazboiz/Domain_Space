interface GraphResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function graphRequest<T>(
  query: string,
  variables?: Record<string, string | number | boolean | object>
): Promise<T> {
  const baseURL = process.env.NEXT_PUBLIC_DOMA_GRAPHQL_URL || "https://api.doma.dev/graphql";
  const apiKey = process.env.NEXT_PUBLIC_DOMA_API_KEY || "";

  const response = await fetch(baseURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const data = (await response.json()) as GraphResponse<T>;

  if (data.errors && data.errors.length) {
    throw new Error(data.errors.map((e) => e.message).join("; "));
  }

  return data.data as T;
}