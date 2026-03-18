/**
 * Shared html2canvas export utility.
 * Dynamically imports html2canvas to avoid bundle bloat.
 */

import { canShare } from './platform';

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
