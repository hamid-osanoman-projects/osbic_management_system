import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { getCroppedImg } from '../../lib/cropUtils';

interface Props {
  image: string;
  onCropComplete: (croppedBlob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}

const PhotoCropper = ({ image, onCropComplete, onCancel }: Props) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: any, pixelCrop: any) => {
    setCroppedAreaPixels(pixelCrop);
  }, []);

  const handleSave = async () => {
    try {
      const croppedBlob = await getCroppedImg(image, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(croppedBlob);
      onCropComplete(croppedBlob, previewUrl);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
        onClick={onCancel}
      />
      
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-2xl bg-[#0A0F1E] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h3 className="text-xl font-syne font-bold text-white mb-1">Adjust Photo</h3>
            <p className="text-xs text-muted-foreground">Zoom and drag to fit the circle</p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 rounded-full hover:bg-white/5 text-muted-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-black min-h-[400px]">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={onZoomChange}
          />
        </div>

        {/* Controls */}
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <ZoomOut size={18} className="text-muted-foreground" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <ZoomIn size={18} className="text-muted-foreground" />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 rounded-xl bg-primary text-[#0A0F1E] font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Apply Crop
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PhotoCropper;
