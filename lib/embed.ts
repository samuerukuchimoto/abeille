export async function embed(text: string): Promise<number[]> {
  const res = await fetch('https://api.groq.com/openai/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nomic-embed-text-v1_5',
      input: text,
    }),
  })
  const data = await res.json()
  if (!data.data?.[0]?.embedding) throw new Error('Embedding failed')
  return data.data[0].embedding
}

export function cosineSim(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    magA += a[i] ** 2
    magB += b[i] ** 2
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB)
  return denom === 0 ? 0 : dot / denom
}