/**
 * Utility to dynamically load html2pdf.js from CDN with caching
 */
declare global {
  interface Window {
    html2pdf?: any;
  }
}

let html2pdfPromise: Promise<any> | null = null;

export function loadHtml2Pdf(): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('html2pdf can only be loaded in the browser'));
  }

  if (window.html2pdf) {
    return Promise.resolve(window.html2pdf);
  }

  if (html2pdfPromise) {
    return html2pdfPromise;
  }

  html2pdfPromise = new Promise((resolve, reject) => {
    // Check if already in DOM
    const existing = document.querySelector('script[data-lib="html2pdf"]');
    if (existing) {
      if (window.html2pdf) {
        resolve(window.html2pdf);
        return;
      }
      existing.addEventListener('load', () => resolve(window.html2pdf));
      existing.addEventListener('error', () => {
        html2pdfPromise = null;
        reject(new Error('Error al cargar html2pdf.js desde la caché del navegador'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    script.setAttribute('data-lib', 'html2pdf');

    const timeout = setTimeout(() => {
      html2pdfPromise = null;
      script.remove();
      reject(new Error('Tiempo de espera agotado al descargar la librería de PDF. Verifica tu conexión a Internet.'));
    }, 10000);

    script.onload = () => {
      clearTimeout(timeout);
      if (window.html2pdf) {
        resolve(window.html2pdf);
      } else {
        html2pdfPromise = null;
        reject(new Error('html2pdf se descargó pero no se inicializó correctamente en el navegador'));
      }
    };

    script.onerror = () => {
      clearTimeout(timeout);
      html2pdfPromise = null;
      reject(new Error('No se pudo cargar la librería html2pdf.js desde el CDN'));
    };

    document.head.appendChild(script);
  });

  return html2pdfPromise;
}

export interface PdfExportOptions {
  filename: string;
  marginMm?: [number, number, number, number] | number;
}

/**
 * Render an HTML element to PDF and download it
 */
export async function downloadElementAsPdf(
  element: HTMLElement,
  options: PdfExportOptions
): Promise<void> {
  const html2pdf = await loadHtml2Pdf();

  const opt = {
    margin: options.marginMm !== undefined ? options.marginMm : 0,
    filename: options.filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      letterRendering: true,
      scrollY: 0,
    },
    jsPDF: {
      unit: 'mm',
      format: 'letter',
      orientation: 'portrait',
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      avoid: ['.page-break-avoid', '.pdf-avoid-break'],
    },
  };

  await html2pdf().set(opt).from(element).save();
}
