// Nomic embed + cosine similarity + Groq complementarity score

export async function embed(text: string): Promise<number[]> {
  const res = await fetch('https://api-atlas.nomic.ai/v1/embedding/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.NOMIC_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'nomic-embed-text-v1',
      texts: [text],
      task_type: 'search_document',
    }),
  })
  if (!res.ok) throw new Error(`Nomic embed failed: ${res.status}`)
  const data = await res.json()
  return data.embeddings[0] as number[]
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] ** 2
    magB += b[i] ** 2
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export async function scoreComplementarity(
  post: string,
  reply: string
): Promise<{ score: number; reason: string }> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content:
            'You evaluate whether two short human signals complement each other — meaning one person genuinely provides what the other lacks, and vice versa. Return only valid JSON with no markdown.',
        },
        {
          role: 'user',
          content: `Post: "${post}"\n\nReply: "${reply}"\n\nScore complementarity from 0 to 1. A score of 1 means the reply exactly completes the need in the post. A score of 0 means they are unrelated or mirror each other instead of complementing. Return JSON: { "score": float, "reason": string }. The reason should be one sentence explaining why — if declining, tell them what kind of signal would actually complement this post.`,
        },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Groq scoring failed: ${res.status}`)
  const data = await res.json()
  const raw = data.choices[0].message.content.trim()
  try {
    return JSON.parse(raw)
  } catch {
    // Fallback if JSON is malformed
    return { score: 0, reason: 'Could not evaluate signals. Try rephrasing.' }
  }
}