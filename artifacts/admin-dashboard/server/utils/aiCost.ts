// SQL expression for the USD cost of one ai_usage row. Rates come from runtime config and are
// checked to be finite numbers before being inlined, so the expression can't carry injection.
export function aiCostSql(alias = 'u') {
  const config = useRuntimeConfig()
  const rate = (v: unknown, name: string) => {
    const n = Number(v)
    if (!Number.isFinite(n) || n < 0) throw createError({ statusCode: 500, statusMessage: `${name} must be a non-negative number` })
    return n
  }
  const input = rate(config.openaiInputUsdPerMillion, 'NUXT_OPENAI_INPUT_USD_PER_MILLION')
  const output = rate(config.openaiOutputUsdPerMillion, 'NUXT_OPENAI_OUTPUT_USD_PER_MILLION')
  const minute = rate(config.deepgramUsdPerMinute, 'NUXT_DEEPGRAM_USD_PER_MINUTE')
  return `(CASE WHEN ${alias}.provider = 'openai'
    THEN (coalesce(${alias}.input_tokens, 0) * ${input} + coalesce(${alias}.output_tokens, 0) * ${output}) / 1000000.0
    ELSE coalesce(${alias}.audio_seconds, 0) / 60.0 * ${minute} END)`
}

export function aiRates() {
  const c = useRuntimeConfig()
  return { openaiPer1mInput: Number(c.openaiInputUsdPerMillion), openaiPer1mOutput: Number(c.openaiOutputUsdPerMillion), deepgramPerMinute: Number(c.deepgramUsdPerMinute) }
}

// Proceeds of one billing_events row: price after store commission and tax. Unknown take-home counts as the full price.
export const PROCEEDS_SQL = 'coalesce(b.price_usd, 0) * coalesce(b.takehome_percentage, 1)'
