import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'motion/react';

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
                    className="glass-card relative rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg z-10 flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-outline-variant bg-surface/50 backdrop-blur-md z-10">
                        <h3
                            id="image-cropper-modal-title"
                            className="text-lg font-bold text-on-surface"
                            style={{ fontFamily: 'var(--font-headline)' }}
                        >
                            Adjust Photo
                        </h3>
                        <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>

                    {/* Crop area */}
                    <div className="relative w-full h-80 sm:h-96 bg-surface-container">
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

                        {/* Rule-of-thirds grid overlay */}
                        <div className="absolute inset-0 pointer-events-none z-[4] flex items-center justify-center">
                            <div className="w-64 h-64 relative">
                                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
                            </div>
                        </div>

                        {/* Primary-container border on crop circle */}
                        {shape === 'circle' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[5]">
                                <div className="w-64 h-64 rounded-full border-2 border-primary-container" />
                            </div>
                        )}

                        {/* Overlay indicators for special shapes */}
                        {shape === 'squircle' && (
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[5]">
                                <div className="w-64 h-64 border-2 border-primary-container rounded-[3rem] shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="p-6 bg-surface border-t border-outline-variant">
                        <div className="flex items-center gap-4 mb-6 px-2">
                            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">zoom_out</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-label="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="flex-1 h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="material-symbols-outlined text-[20px] text-on-surface-variant">zoom_in</span>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container transition">
                                Cancel
                            </button>
                            <button onClick={handleSave} className="flex-1 px-4 py-3 bg-primary-container text-on-primary-container rounded-xl font-medium transition hover:brightness-110 active:scale-[0.97] flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">check</span>
                                Apply Changes
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
