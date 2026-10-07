import type { ListingModel, Tier } from '@/api/workflows'
/** Exact cartesian indices; preserve edits only for the same structural combination. */
export function listingModels(tiers: Tier[], previous: ListingModel[], price: string): ListingModel[] {
  if (!tiers.length) return []
  let indices: number[][] = [[]]
  for (const tier of tiers) indices = indices.flatMap((i) => tier.options.map((_, n) => [...i, n]))
  if (indices.length > 50) throw new Error('Maksimal 50 kombinasi varian.')
  return indices.map(
    (tier_index) => previous.find((m) => m.tier_index.join(':') === tier_index.join(':')) ?? { tier_index, sku: '', price, stock: 0 },
  )
}
export const modelLabel = (tiers: Tier[], index: number[]) =>
  index.map((n, t) => `${tiers[t]?.name}: ${tiers[t]?.options[n]?.option}`).join(' · ')

/** Remove conditional child values that are no longer reachable after a parent selection changes. */
export function reachableAttributes(
  nodes: import('@/api/workflows').AttributeNode[],
  values: import('@/api/workflows').Attribute[],
): import('@/api/workflows').Attribute[] {
  const ids = new Set<number>()
  function visit(tree: import('@/api/workflows').AttributeNode[]) {
    for (const node of tree) {
      ids.add(node.attribute_id)
      const chosen = values.find((a) => a.attribute_id === node.attribute_id)?.attribute_value_list ?? []
      for (const v of node.attribute_value_list) if (chosen.some((c) => c.value_id === v.value_id)) visit(v.child_attribute_list ?? [])
    }
  }
  visit(nodes)
  return values.filter((a) => ids.has(a.attribute_id))
}
