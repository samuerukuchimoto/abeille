const TEST_MODE = process.env.TEST_MODE === 'true'

export async function embed(text: string): Promise<number[]> {
  if (TEST_MODE) {
    return Array.from({ length: 768 }, (_, i) =>
      Math.sin(i * 0.1 + text.charCodeAt(i % text.length || 0) * 0.01)
    )
  }

  const res = await fetch('https://api-atlas.nomic.ai/v1/embedding/text', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NOMIC_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nomic-embed-text-v1.5',
      texts: [text],
      task_type: 'search_document',
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('[abeille] Nomic embed error:', res.status, JSON.stringify(data))
    throw new Error(`Embedding failed: ${data?.message ?? res.status}`)
  }

  const embedding = data.embeddings?.[0]
  if (!embedding) {
    console.error('[abeille] Nomic embed unexpected shape:', JSON.stringify(data))
    throw new Error('Embedding failed: unexpected response shape')
  }

  return embedding
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