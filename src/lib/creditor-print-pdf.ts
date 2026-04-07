/**
 * html2canvas ne sait pas parser lab()/oklch() (feuilles globales).
 * On retire les styles du clone ; le gabarit PDF utilise surtout des styles inline (hex).
 */

const PDF_ROOT_ID = 'creditor-pdf-capture'

export function prepareHtml2PdfClone(clonedDoc: Document): void {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((n) => n.remove())
  clonedDoc.querySelectorAll('style').forEach((n) => n.remove())

  const style = clonedDoc.createElement('style')
  style.textContent = pdfCloneCss()
  clonedDoc.head.appendChild(style)

  softenBoxShadowOnly(clonedDoc)
}

function pdfCloneCss(): string {
  return `
    #${PDF_ROOT_ID} {
      box-sizing: border-box;
    }
    #${PDF_ROOT_ID} * {
      box-sizing: border-box;
    }
    #${PDF_ROOT_ID} table {
      border-collapse: collapse;
    }
  `
}

/** Évite les ombres héritées sans écraser les couleurs inline du gabarit. */
function softenBoxShadowOnly(clonedDoc: Document): void {
  const root = clonedDoc.getElementById(PDF_ROOT_ID)
  if (!root) return
  for (const el of root.querySelectorAll('*')) {
    if (!(el instanceof HTMLElement)) continue
    el.style.setProperty('box-shadow', 'none', 'important')
    el.style.setProperty('text-shadow', 'none', 'important')
  }
}

export function creditorPdfFilename(creditorName: string): string {
  const safe = creditorName.replace(/[^\p{L}\p{N}\s\-_.]/gu, '').trim().replace(/\s+/g, '-') || 'creancier'
  const d = new Date().toISOString().slice(0, 10)
  return `creancier-${safe}-${d}.pdf`
}

export const creditorPdfDomIds = { root: PDF_ROOT_ID, metrics: 'creditor-pdf-metrics' } as const
