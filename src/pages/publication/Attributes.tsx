import type { Attribute, AttributeNode, AttributeValue } from '@/api/workflows'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
const selectClass = 'w-full rounded-md border bg-background p-2 text-sm'
export default function Attributes({
  nodes,
  values,
  change,
}: {
  nodes: AttributeNode[]
  values: Attribute[]
  change: (values: Attribute[]) => void
}) {
  function update(id: number, selected: AttributeValue[]) {
    change([
      ...values.filter((a) => a.attribute_id !== id),
      ...(selected.length ? [{ attribute_id: id, attribute_value_list: selected }] : []),
    ])
  }
  return (
    <div className="space-y-3">
      {nodes.map((node) => {
        const chosen = values.find((a) => a.attribute_id === node.attribute_id)?.attribute_value_list ?? []
        const info = node.attribute_info ?? {}
        const children = node.attribute_value_list
          .filter((v) => chosen.some((c) => c.value_id === v.value_id))
          .flatMap((v) => v.child_attribute_list ?? [])
        const multiple = [4, 5].includes(info.input_type ?? 1)
        const custom = [2, 3, 5].includes(info.input_type ?? 1)
        return (
          <div key={node.attribute_id} className="space-y-1">
            <Label htmlFor={`attribute-${node.attribute_id}`}>
              {node.name}
              {node.mandatory ? ' *' : ''}
            </Label>
            {node.attribute_value_list.length > 0 && (
              <select
                id={`attribute-${node.attribute_id}`}
                className={selectClass}
                multiple={multiple}
                value={multiple ? chosen.filter((v) => v.value_id !== 0).map((v) => String(v.value_id)) : String(chosen[0]?.value_id ?? '')}
                onChange={(e) =>
                  update(
                    node.attribute_id,
                    Array.from(e.target.selectedOptions)
                      .filter((o) => o.value)
                      .map((o) => {
                        const v = node.attribute_value_list.find((v) => String(v.value_id) === o.value)!
                        return { value_id: v.value_id, original_value_name: v.name, ...(v.value_unit ? { value_unit: v.value_unit } : {}) }
                      }),
                  )
                }
              >
                <option value="">Pilih {node.name}</option>
                {node.attribute_value_list.map((v) => (
                  <option key={v.value_id} value={v.value_id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
            {multiple && (
              <p className="text-xs text-muted-foreground">Boleh pilih beberapa; maksimal {info.max_value_count || 50} nilai.</p>
            )}
            {custom && (
              <Input
                aria-label={`Nilai lain ${node.name}`}
                placeholder={`Isi ${node.name} jika tidak ada di pilihan`}
                value={chosen.find((v) => v.value_id === 0)?.original_value_name ?? ''}
                onChange={(e) =>
                  update(node.attribute_id, [
                    ...(multiple ? chosen.filter((v) => v.value_id !== 0) : []),
                    ...(e.target.value ? [{ value_id: 0, original_value_name: e.target.value }] : []),
                  ])
                }
              />
            )}
            {!!info.attribute_unit_list?.length && (
              <select
                aria-label={`Satuan ${node.name}`}
                className={selectClass}
                value={chosen[0]?.value_unit ?? ''}
                onChange={(e) =>
                  update(
                    node.attribute_id,
                    chosen.map((v) => ({ ...v, value_unit: e.target.value })),
                  )
                }
              >
                <option value="">Pilih satuan</option>
                {info.attribute_unit_list.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            )}
            {!!children.length && (
              <div className="border-l pl-3">
                <Attributes nodes={children} values={values} change={change} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
