/** Excel-safe UTF-8 CSV; formulas are escaped and output is never uploaded. */
export function exportCsv(
  filename: string,
  rows: (string | number | null | undefined)[][],
) {
  const cell = (v: string | number | null | undefined) => {
    const text = String(v ?? '')
    return (
      '"' +
      (/^[=+@\-\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""') +
      '"'
    )
  }
  const blob = new Blob(
    ['\ufeff' + rows.map((row) => row.map(cell).join(';')).join('\r\n')],
    { type: 'text/csv;charset=utf-8' },
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
