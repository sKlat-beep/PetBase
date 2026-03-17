import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react';

interface ImageCropperModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onCropComplete: (croppedAreaPixels: any) => void;
    shape?: 'square' | 'circle' | 'squircle' | 'hexagon';
}

export function ImageCropperModal({ isOpen, onClose, imageSrc, onCropComplete, shape = 'circle' }: ImageCropperModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixelsState, setCroppedAreaPixelsState] = useState(null);

    const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixelsState(croppedAreaPixels);
    }, []);

    const handleSave = () => {
        if (croppedAreaPixelsState) {
            onCropComplete(croppedAreaPixelsState);
        }
    };

    if (!isOpen || !imageSrc) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="image-cropper-modal-title"
                    className="relative bg-white dark:bg-neutral-800 rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg z-10 flex flex-col"
                >
                    <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-700 bg-white/50 dark:bg-neutral-800/50 backdrop-blur-md z-10">
                        <h3 id="image-cropper-modal-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Adjust Photo</h3>
                        <button onClick={onClose} className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative w-full h-80 sm:h-96 bg-neutral-950">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape={shape === 'circle' ? 'round' : 'rect'}
                            showGrid={false}
                            onCropChange={setCrop}
                            onCropComplete={onCropCompleteInternal}
                            onZoomChange={setZoom}
                            classes={{ containerClassName: 'h-full w-full relative' }}
                        />

                        {/* Overlay indicators for special shapes */}
                        {shape === 'squircle' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[5]">
                                <div className={`w-64 h-64 border-2 border-white/50 rounded-[3rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]`} />
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-white dark:bg-neutral-800 border-t border-neutral-100 dark:border-neutral-700">
                        <div className="flex items-center gap-4 mb-6 px-2">
                            <ZoomOut className="w-5 h-5 text-neutral-400" />
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-label="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <ZoomIn className="w-5 h-5 text-neutral-400" />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition flex items-center justify-center gap-2">
                                <Check className="w-4 h-4" /> Apply Crop
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

// Helper to extract the cropped image
export async function getCroppedImg(
    imageSrc: string,
    pixelCrop: any,
    rotation = 0
): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((file) => {
            resolve(URL.createObjectURL(file!));
        }, 'image/jpeg');
    });
}

const createImage = (url: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });
