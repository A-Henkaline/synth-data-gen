export type ColumnType = 'string' | 'number' | 'boolean' | 'date'

export interface DatasetColumn {
  name: string
  type: ColumnType
}

export interface DatasetTable {
  name: string
  columns: DatasetColumn[]
  rows: Record<string, unknown>[]
}

export interface GeneratedDataset {
  tables: DatasetTable[]
  schemaDescription: string
  structure: 'single' | 'multi'
  dirtiness: number
}

export interface GenerateRequest {
  description: string
  structure: 'single' | 'multi'
  rowCount: number
  dirtiness: number
  model: string
}
