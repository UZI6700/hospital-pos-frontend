/** Report export helpers. Heavy libraries are loaded on demand so they stay out of the main bundle. */
export type ExportCol = { label: string; get: (row: any) => any }

const toMatrix = (cols: ExportCol[], rows: any[]) => rows.map(r => cols.map(c => { const v = c.get(r); return v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : v }))
const download = (blob: Blob, name: string) => {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function exportCSV(name: string, cols: ExportCol[], rows: any[]) {
  const esc = (v: any) => `"${String(v).replace(/"/g, '""')}"`
  const csv = [cols.map(c => esc(c.label)).join(','), ...toMatrix(cols, rows).map(r => r.map(esc).join(','))].join('\n')
  download(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `${name}.csv`)
}

export async function exportXLSX(name: string, cols: ExportCol[], rows: any[]) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([cols.map(c => c.label), ...toMatrix(cols, rows)])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 30))
  XLSX.writeFile(wb, `${name}.xlsx`)
}

export async function exportPDF(name: string, cols: ExportCol[], rows: any[]) {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new JsPDF({ orientation: cols.length > 6 ? 'landscape' : 'portrait' })
  doc.setFontSize(14); doc.text(name, 14, 16)
  doc.setFontSize(9); doc.text(`Generated ${new Date().toLocaleString()}`, 14, 22)
  autoTable(doc, { head: [cols.map(c => c.label)], body: toMatrix(cols, rows).map(r => r.map(v => String(v).replace(/[₹₨]/g, 'Rs '))), startY: 27, styles: { fontSize: 8 }, headStyles: { fillColor: [30, 64, 175] } })
  doc.save(`${name}.pdf`)
}
