import React, { useRef, useEffect } from 'react';
import { Modal } from './Modal';

// Declare Cropper from the global scope (CDN)
declare const Cropper: any;

interface ImageCropperModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string | null;
    onCrop: (croppedImageUrl: string) => void;
}

export const ImageCropperModal: React.FC<ImageCropperModalProps> = ({ isOpen, onClose, imageSrc, onCrop }) => {
    const imageRef = useRef<HTMLImageElement>(null);
    const cropperRef = useRef<any>(null);

    useEffect(() => {
        if (isOpen && imageSrc && imageRef.current) {
            // Destroy previous instance to prevent issues
            if (cropperRef.current) {
                cropperRef.current.destroy();
            }

            // Initialize Cropper.js
            const cropper = new Cropper(imageRef.current, {
                aspectRatio: 16 / 9,
                viewMode: 1,
                background: false,
                autoCropArea: 0.95,
                responsive: true,
                movable: true,
                zoomable: true,
                guides: true,
            });
            cropperRef.current = cropper;
        }

        // Cleanup when the component unmounts or the modal closes
        return () => {
            if (cropperRef.current) {
                cropperRef.current.destroy();
                cropperRef.current = null;
            }
        };
    }, [isOpen, imageSrc]);

    const handleCrop = () => {
        if (cropperRef.current) {
            // Get the cropped canvas with specified dimensions for quality
            const croppedCanvas = cropperRef.current.getCroppedCanvas({
                width: 1280,
                height: 720,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            
            // Convert to base64 JPEG for better file size
            onCrop(croppedCanvas.toDataURL('image/jpeg', 0.9));
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Crop Banner Image">
            <div className="flex flex-col h-[70vh]">
                <div className="flex-grow bg-slate-900/50 flex items-center justify-center p-2">
                    {imageSrc && (
                        <div className="max-w-full max-h-full">
                            <img ref={imageRef} src={imageSrc} alt="Crop preview" style={{ display: 'block', maxWidth: '100%', maxHeight: '60vh' }} />
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t border-slate-700">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg">
                        Cancel
                    </button>
                    <button onClick={handleCrop} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                        Crop & Use Image
                    </button>
                </div>
            </div>
        </Modal>
    );
};
