'use client'

import { useState } from 'react'
import type { GeneratedDataset, DatasetTable } from '@/lib/datasetTypes'

const ROW_COUNTS = [25, 50, 100] as const

const MODELS = [
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', maker: 'Meta', tag: 'Best quality' },
  { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 70B', maker: 'DeepSeek', tag: 'Reasoning' },
  { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', maker: 'Mistral AI', tag: 'Long context' },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B', maker: 'Google', tag: 'Fast' },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B', maker: 'Meta', tag: 'Fastest' },
] as const

function dirtinessLabel(v: number) {
  if (v === 0) return 'Clean'
  if (v < 20) return 'Minimal noise'
  if (v < 40) return 'Light ETL'
  if (v < 60) return 'Moderate'
  if (v < 80) return 'Heavy ETL'
  return 'Raw chaos'
}

function dirtinessBadgeClass(v: number) {
  if (v === 0) return 'bg-green-900/40 text-green-400'
  if (v < 40) return 'bg-yellow-900/40 text-yellow-400'
  if (v < 70) return 'bg-orange-900/40 text-orange-400'
  return 'bg-red-900/40 text-red-400'
}

function tableToCsv(table: DatasetTable): string {
  const headers = table.columns.map((c) => c.name).join(',')
  const lines = table.rows.map((row) =>
    table.columns
      .map((c) => {
        const v = row[c.name]
        if (v === null || v === undefined) return ''
        const s = String(v)
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? `"${s.replace(/"/g, '""')}"`
          : s
      })
      .join(',')
  )
  return [headers, ...lines].join('\n')
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function isNullLike(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    v === '' ||
    v === 'N/A' ||
    v === 'NULL' ||
    v === 'n/a' ||
    v === '#N/A'
  )
}

export default function Home() {
  const [description, setDescription] = useState('')
  const [structure, setStructure] = useState<'single' | 'multi'>('single')
  const [rowCount, setRowCount] = useState<25 | 50 | 100>(50)
  const [dirtiness, setDirtiness] = useState(0)
  const [model, setModel] = useState<string>(MODELS[0].id)
  const [loading, setLoading] = useState(false)
  const [dataset, setDataset] = useState<GeneratedDataset | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTable, setActiveTable] = useState(0)

  async function generate() {
    if (!description.trim()) return
    setLoading(true)
    setError(null)
    setDataset(null)
    setActiveTable(0)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, structure, rowCount, dirtiness, model }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Generation failed')
      }
      setDataset(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const table: DatasetTable | undefined = dataset?.tables[activeTable]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Synthetic Dataset Generator</h1>
        <p className="text-slate-400 text-sm mt-1">
          Describe a dataset — the AI models it on real-world data patterns and generates it for you.
        </p>
      </div>

      {/* Config form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 mb-6">
        <div>
          <label className="block text-sm text-slate-400 mb-1.5">
            What kind of dataset do you need?
          </label>
          <textarea
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 resize-none"
            rows={3}
            placeholder="e.g. E-commerce orders with customers and products, hospital patient records, NBA player stats from last 5 seasons, retail sales with regional breakdowns…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Structure */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Structure</label>
            <div className="flex gap-2">
              {(['single', 'multi'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStructure(s)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    structure === s
                      ? 'bg-slate-100 text-slate-900 border-slate-100'
                      : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {s === 'single' ? 'Single Table' : 'Multi-table'}
                </button>
              ))}
            </div>
            {structure === 'multi' && (
              <p className="text-xs text-slate-500 mt-1.5">
                Fact + dimension tables with foreign keys — SQL-ready semantic model
              </p>
            )}
          </div>

          {/* Row count */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">Rows</label>
            <div className="flex gap-2">
              {ROW_COUNTS.map((n) => (
                <button
                  key={n}
                  onClick={() => setRowCount(n)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    rowCount === n
                      ? 'bg-slate-100 text-slate-900 border-slate-100'
                      : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Model selector */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">AI Model</label>
          <div className="grid grid-cols-1 gap-1.5">
            {MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-colors text-left ${
                  model === m.id
                    ? 'bg-slate-800 border-blue-500 text-slate-100'
                    : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                }`}
              >
                <span>
                  <span className="font-medium">{m.label}</span>
                  <span className="text-slate-500 ml-2">by {m.maker}</span>
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  model === m.id ? 'bg-blue-900/50 text-blue-300' : 'bg-slate-800 text-slate-500'
                }`}>
                  {m.tag}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dirtiness slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-400">Data quality</label>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${dirtinessBadgeClass(dirtiness)}`}
            >
              {dirtinessLabel(dirtiness)} · {dirtiness}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={dirtiness}
            onChange={(e) => setDirtiness(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-600 mt-1 select-none">
            <span>Clean</span>
            <span>Light ETL</span>
            <span>Moderate</span>
            <span>Heavy ETL</span>
            <span>Raw chaos</span>
          </div>
          {dirtiness > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Injects NULLs, typos, duplicate rows, and outlier values proportional to {dirtiness}%
              — ideal for ETL and data-cleaning practice.
            </p>
          )}
        </div>

        <button
          onClick={generate}
          disabled={loading || !description.trim()}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Generating…' : 'Generate Dataset'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {dataset && (
        <div className="space-y-4">
          {/* Schema description */}
          <div className="bg-slate-900 rounded-xl p-5 border border-blue-900/50">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
              Data Model
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">{dataset.schemaDescription}</p>
            {dataset.dirtiness > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                Dirtiness applied: {dataset.dirtiness}% — NULLs, typos, duplicates, and outliers
                have been injected.
              </p>
            )}
          </div>

          {/* Table tabs */}
          {dataset.tables.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {dataset.tables.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => setActiveTable(i)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    i === activeTable
                      ? 'bg-slate-100 text-slate-900 border-slate-100'
                      : 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {t.name}
                  <span className="ml-1.5 text-xs opacity-50">{t.rows.length}</span>
                </button>
              ))}
            </div>
          )}

          {/* Table preview */}
          {table && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                <div>
                  <span className="font-medium text-sm">{table.name}</span>
                  <span className="text-slate-500 text-xs ml-2">
                    {table.rows.length} rows · {table.columns.length} columns
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => downloadFile(tableToCsv(table), `${table.name}.csv`, 'text/csv')}
                    className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
                  >
                    ↓ CSV
                  </button>
                  <button
                    onClick={() =>
                      downloadFile(
                        JSON.stringify(table.rows, null, 2),
                        `${table.name}.json`,
                        'application/json'
                      )
                    }
                    className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
                  >
                    ↓ JSON
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      {table.columns.map((col) => (
                        <th
                          key={col.name}
                          className="px-4 py-2.5 text-left text-slate-400 font-medium whitespace-nowrap"
                        >
                          <div>{col.name}</div>
                          <div className="text-slate-600 font-normal">{col.type}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.slice(0, 25).map((row, i) => (
                      <tr key={i} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                        {table.columns.map((col) => {
                          const v = row[col.name]
                          return (
                            <td
                              key={col.name}
                              className="px-4 py-2 whitespace-nowrap max-w-48 truncate"
                            >
                              {isNullLike(v) ? (
                                <span className="text-red-500/60 italic">null</span>
                              ) : (
                                <span className="text-slate-300">{String(v)}</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {table.rows.length > 25 && (
                  <p className="px-5 py-3 text-xs text-slate-500 border-t border-slate-800/40">
                    Showing 25 of {table.rows.length} rows — download for the full dataset.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Download all (multi-table) */}
          {dataset.tables.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() =>
                  dataset.tables.forEach((t) =>
                    downloadFile(tableToCsv(t), `${t.name}.csv`, 'text/csv')
                  )
                }
                className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
              >
                ↓ All tables as CSV
              </button>
              <button
                onClick={() =>
                  downloadFile(
                    JSON.stringify(
                      Object.fromEntries(dataset.tables.map((t) => [t.name, t.rows])),
                      null,
                      2
                    ),
                    'dataset.json',
                    'application/json'
                  )
                }
                className="px-4 py-2 border border-slate-700 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
              >
                ↓ All tables as JSON
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
