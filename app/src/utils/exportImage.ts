/**
 * Shared html2canvas export utility.
 * Dynamically imports html2canvas to avoid bundle bloat.
 */

import { canShare, canDownloadFile } from './platform';

export async function downloadElementAsImage(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob(b => resolve(b!), 'image/png'),
  );

  if (canShare() && navigator.share) {
    const file = new File([blob], filename, { type: 'image/png' });
    await navigator.share({ files: [file], title: filename.replace('.png', '') });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/**
 * Render a DOM element to a single-page PDF and download it.
 * Dynamically imports jspdf + html2canvas to keep main bundle small.
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });
  const imgData = canvas.toDataURL('image/png');
  const pxW = canvas.width;
  const pxH = canvas.height;
  const pdfW = 210; // A4 width in mm
  const pdfH = (pxH * pdfW) / pxW;
  const pdf = new jsPDF({ unit: 'mm', format: [pdfW, pdfH] });
  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);
  pdf.save(filename);
}
