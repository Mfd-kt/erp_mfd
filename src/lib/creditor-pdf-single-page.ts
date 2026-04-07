import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { prepareHtml2PdfClone } from '@/lib/creditor-print-pdf'

const PAGE_BG = '#f5f5f4'

/**
 * Cible ~96 dpi pour coller au ratio A4 (210 mm × 297 mm).
 * Utilisé pour le cadre de capture (largeur + hauteur mini).
 */
export const PDF_A4_PAGE_PX = {
  w: 794,
  h: Math.round((794 * 297) / 210),
} as const

/**
 * Une seule page A4 : image mise à l’échelle pour remplir au mieux la zone utile (souvent pleine page si le cadre est A4).
 */
export async function renderCreditorPdfSinglePageBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: PAGE_BG,
    foreignObjectRendering: false,
    onclone: (clonedDoc: Document) => {
      prepareHtml2PdfClone(clonedDoc)
    },
  })

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const marginMm = 3
  const maxW = pageW - 2 * marginMm
  const maxH = pageH - 2 * marginMm

  const imgData = canvas.toDataURL('image/jpeg', 0.92)
  const cw = canvas.width
  const ch = canvas.height
  const aspect = ch / cw
  const targetAspect = maxH / maxW

  let drawW: number
  let drawH: number
  let x: number
  let y: number

  /** Cadre proche du ratio A4 → remplit toute la zone imprimable sans bandes inutiles. */
  if (Math.abs(aspect - targetAspect) < 0.04) {
    drawW = maxW
    drawH = maxH
    x = marginMm
    y = marginMm
  } else {
    drawW = maxW
    drawH = drawW * aspect
    if (drawH > maxH) {
      drawH = maxH
      drawW = drawH / aspect
    }
    x = marginMm + (maxW - drawW) / 2
    y = marginMm
  }

  pdf.addImage(imgData, 'JPEG', x, y, drawW, drawH)

  return pdf.output('blob')
}
