import { useQuery } from '@tanstack/react-query'
import { assistantStatus } from '@/api/assistant'
import { aiMoney, usd } from '@/lib/assistantDisplay'

/** Always-visible daily AI usage, e.g. "Hari ini $0.12 / $0.50"; details on hover/long-press. */
export default function AiUsageBadge() {
  const { data } = useQuery({ queryKey: ['assistant-status'], queryFn: assistantStatus, refetchInterval: 60_000 })
  if (!data) return null
  const detail = `Terpakai ${aiMoney(data.spent_usd, data.usd_idr)} · dicadangkan ${usd(data.reserved_usd)} · batas ${aiMoney(data.daily_usd, data.usd_idr)} · ${data.used_turns}/${data.daily_turns} pesan`
  return <span role="status" aria-label={`Pemakaian AI hari ini. ${detail}`} title={detail} className="whitespace-nowrap rounded-full border px-2 py-0.5 text-xs text-muted-foreground tabular-nums">Hari ini {usd(data.spent_usd)} / {usd(data.daily_usd)}</span>
}
