import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface CropModalProps {
  imageUrl: string;
  onSave: (croppedUrl: string) => void;
  onClose: () => void;
}

export function CropModal({ imageUrl, onSave, onClose }: CropModalProps) {
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 80, height: 80, x: 10, y: 10 });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleSave = useCallback(() => {
    if (!completedCrop || !imgRef.current) return;
    const canvas = document.createElement('canvas');
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0, completedCrop.width, completedCrop.height
    );
    canvas.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      onSave(url);
      onClose();
    }, 'image/jpeg', 0.9);
  }, [completedCrop, onSave, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="crop-modal-title" className="bg-surface-container rounded-2xl shadow-2xl flex flex-col max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
          <h2 id="crop-modal-title" className="text-sm font-semibold text-on-surface">Crop Photo</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-surface-container-low">
          <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
            <img ref={imgRef} src={imageUrl} alt="Crop preview" className="max-h-[60vh] max-w-full object-contain" />
          </ReactCrop>
        </div>
        <div className="flex gap-2 px-4 py-3 border-t border-outline-variant shrink-0 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!completedCrop}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary hover:bg-primary/90 text-on-primary transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">check</span> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
