// "Exportar meu histórico" (30c, rodapé) — gera um PDF de verdade com
// jsPDF, no aparelho, sem servidor. Só layout: quem chama (MetricsBlocksScreen)
// já traduziu e formatou cada linha (mesma separação de responsabilidade de
// sessionDurationMath.js/metricsSummary.js — cálculo/texto num lugar,
// desenho noutro), pra este módulo não duplicar i18n nem regra de negócio.
import { jsPDF } from 'jspdf'

const MARGIN_X = 14
const PAGE_BOTTOM = 280
const COL_X = [MARGIN_X, 120, 155, 182]

function ensureSpace(doc, y, needed = 6) {
  if (y + needed <= PAGE_BOTTOM) return y
  doc.addPage()
  return 20
}

// `model`: { fileName, title, generatedLabel, sections }
// section: { heading, lines?: string[], table?: { headers: string[], rows: string[][] } }
export function exportMetricsPdf(model) {
  const { fileName, title, generatedLabel, sections } = model
  const doc = new jsPDF()

  let y = 20
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(title, MARGIN_X, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(120)
  doc.text(generatedLabel, MARGIN_X, y)
  doc.setTextColor(20)
  y += 10

  for (const section of sections) {
    y = ensureSpace(doc, y, 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12.5)
    doc.text(section.heading, MARGIN_X, y)
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10.5)
    for (const line of section.lines ?? []) {
      y = ensureSpace(doc, y)
      doc.text(line, MARGIN_X, y)
      y += 6
    }

    if (section.table) {
      const { headers, rows } = section.table
      y = ensureSpace(doc, y, 8)
      doc.setFont('helvetica', 'bold')
      headers.forEach((h, i) => doc.text(h, COL_X[i] ?? MARGIN_X, y))
      y += 6
      doc.setFont('helvetica', 'normal')
      for (const row of rows) {
        y = ensureSpace(doc, y)
        row.forEach((cell, i) => doc.text(String(cell), COL_X[i] ?? MARGIN_X, y))
        y += 6
      }
    }

    y += 6
  }

  doc.save(fileName)
}
