/**
 * Liest eine Bilddatei, skaliert sie auf maximal `maxSize` px (laengste Kante)
 * herunter und gibt sie als komprimiertes JPEG-Data-URL zurueck. So bleiben
 * Profilfotos klein genug (~20–60 KB), um ohne Firebase Storage direkt in
 * Firestore (1-MB-Limit) gespeichert und ueberall synchronisiert zu werden.
 */
export function compressImageFile(file: File, maxSize = 256, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();

      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });
}
