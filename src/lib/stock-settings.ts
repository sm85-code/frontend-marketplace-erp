import { useQuery } from '@tanstack/react-query'
import { getPengaturanStok } from '@/api/endpoints'

export function useStockSettings() {
  const query = useQuery({ queryKey: ['pengaturan-stok'], queryFn: getPengaturanStok })
  return { ...query, warehouseEnabled: query.data?.gudang_aktif === true }
}
