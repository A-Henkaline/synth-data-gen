import Groq from 'groq-sdk'

let _groq: Groq | null = null

export function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return _groq
}

export const GROQ_MODEL = 'llama-3.3-70b-versatile'
