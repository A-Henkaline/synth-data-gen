import { getGroq, GROQ_MODEL } from '@/lib/groq'
import type { GenerateRequest, GeneratedDataset, DatasetTable, DatasetColumn } from '@/lib/datasetTypes'

const ALLOWED_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'deepseek-r1-distill-llama-70b',
  'mixtral-8x7b-32768',
  'llama-3.1-8b-instant',
  'gemma2-9b-it',
])

export async function POST(request: Request) {
  const body: GenerateRequest = await request.json()
  const { description, structure, rowCount, dirtiness } = body
  const model = ALLOWED_MODELS.has(body.model) ? body.model : GROQ_MODEL

  if (!description?.trim()) {
    return Response.json({ error: 'description is required' }, { status: 400 })
  }

  const cappedRows = Math.min(Math.max(rowCount, 10), 100)

  const tableInstruction =
    structure === 'multi'
      ? `Generate 2–4 related tables forming a normalized semantic model with foreign key relationships. Include a primary fact/transaction table and 1–3 dimension tables (e.g. customers, products, categories, regions). Each table should have ${Math.ceil(cappedRows / 2)}–${cappedRows} rows.`
      : `Generate a single table with exactly ${cappedRows} rows.`

  const prompt = `You are a synthetic data generator with expert knowledge of real-world data patterns across every industry and domain.

Generate a realistic synthetic dataset for: "${description}"

${tableInstruction}

Use your knowledge of what real ${description} data looks like in practice — realistic value distributions, appropriate ID formats, typical field names used by professionals in this domain, plausible relationships between fields.

Respond with ONLY valid JSON in exactly this format — no markdown, no explanation:
{
  "schemaDescription": "2-3 sentences describing the data model and its real-world context",
  "tables": [
    {
      "name": "snake_case_table_name",
      "columns": [
        { "name": "column_name", "type": "string" }
      ],
      "rows": [
        { "column_name": "value" }
      ]
    }
  ]
}

Column types must be one of: string, number, boolean, date.
Make the data genuinely realistic — vary the values, use real-sounding names, realistic IDs, proper date formats (YYYY-MM-DD), realistic numeric ranges.`

  let raw: string
  try {
    const completion = await getGroq().chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 8000,
      temperature: 0.8,
    })
    raw = completion.choices[0]?.message?.content ?? '{}'
  } catch (e) {
    return Response.json(
      { error: `AI request failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 500 }
    )
  }

  let parsed: { schemaDescription?: string; tables?: DatasetTable[] }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return Response.json({ error: 'Failed to parse AI response as JSON' }, { status: 500 })
  }

  if (!parsed.tables?.length) {
    return Response.json({ error: 'AI returned no tables' }, { status: 500 })
  }

  const tables = dirtiness > 0 ? applyDirtiness(parsed.tables, dirtiness) : parsed.tables

  const result: GeneratedDataset = {
    tables,
    schemaDescription: parsed.schemaDescription ?? '',
    structure,
    dirtiness,
  }

  return Response.json(result)
}

function applyDirtiness(tables: DatasetTable[], dirtiness: number): DatasetTable[] {
  return tables.map((table) => ({
    ...table,
    rows: dirtyRows(table.rows, table.columns, dirtiness),
  }))
}

function dirtyRows(
  rows: Record<string, unknown>[],
  columns: DatasetColumn[],
  dirtiness: number
): Record<string, unknown>[] {
  const d = dirtiness / 100

  const result = rows.map((row) => {
    const newRow: Record<string, unknown> = {}
    for (const col of columns) {
      let value = row[col.name]
      const r = Math.random()

      if (r < d * 0.35) {
        const nullForms = [null, '', 'N/A', 'NULL', 'n/a', '#N/A', undefined]
        value = nullForms[Math.floor(Math.random() * nullForms.length)]
      } else if (col.type === 'string' && value && r < d * 0.6) {
        value = addTypo(String(value))
      } else if (col.type === 'number' && value != null && r < d * 0.5) {
        const n = Number(value)
        if (!isNaN(n)) {
          value = Math.random() < 0.5 ? n * (50 + Math.random() * 50) : -Math.abs(n)
        }
      }

      newRow[col.name] = value
    }
    return newRow
  })

  const dupeCount = Math.floor(rows.length * d * 0.2)
  for (let i = 0; i < dupeCount; i++) {
    const src = result[Math.floor(Math.random() * result.length)]
    result.splice(Math.floor(Math.random() * result.length), 0, { ...src })
  }

  return result
}

function addTypo(s: string): string {
  if (s.length < 2) return s
  const pos = Math.floor(Math.random() * (s.length - 1))
  const ops = [
    () => s.slice(0, pos) + (s[pos + 1] ?? '') + s[pos] + s.slice(pos + 2),
    () => s.slice(0, pos) + s[pos] + s[pos] + s.slice(pos + 1),
    () => s.slice(0, pos) + s.slice(pos + 1),
    () => s.toUpperCase(),
    () => s.toLowerCase(),
  ]
  return ops[Math.floor(Math.random() * ops.length)]()
}
