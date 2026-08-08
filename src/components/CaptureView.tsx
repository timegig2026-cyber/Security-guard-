import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, CheckCircle, Upload, Calendar, RefreshCw, ShieldCheck, Share2, Trash2, Maximize2, X, Copy, Mail, ExternalLink } from 'lucide-react';
import { CapturedPhoto } from '../types';
import { playClickSound } from '../utils/sound';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.459 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Default sample photos for easy desktop web testing/preview without device camera
const SAMPLE_PHOTOS = [
  { label: 'Warehouse Dock', url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80' },
  { label: 'IT Server Room', url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Front Entrance Lobby', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Fence Perimeter', url: 'https://images.unsplash.com/photo-1508847154043-be12a3654121?auto=format&fit=crop&w=1200&q=80' },
];

interface CaptureViewProps {
  onHideBottomNavChange?: (hide: boolean) => void;
  isRestricted: () => boolean;
}

export const CaptureView: React.FC<CaptureViewProps> = ({ onHideBottomNavChange, isRestricted }) => {
  const [photos, setPhotos] = useState<CapturedPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('captured_photos_data');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [visitType, setVisitType] = useState<'On Duty' | '2nd Visit'>('On Duty');
  const [locationName, setLocationName] = useState('Main Warehouse Gate');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modal / Share states
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [sharePhotoTarget, setSharePhotoTarget] = useState<CapturedPhoto | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notify parent component about fullscreen state to hide the bottom navigation menu
  useEffect(() => {
    onHideBottomNavChange?.(selectedPhoto !== null);
  }, [selectedPhoto, onHideBottomNavChange]);

  // Synchronize captured photos to local storage
  useEffect(() => {
    try {
      localStorage.setItem('captured_photos_data', JSON.stringify(photos));
    } catch (e) {
      console.error(e);
    }
  }, [photos]);

  const processImageAndStamp = (imageSrc: string) => {
    if (isRestricted()) {
      alert("This feature is only available for premium subscribers. Please subscribe to capture, timestamp, and save photos to your gallery.");
      return;
    }
    
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          saveCapturedPhoto(imageSrc);
          return;
        }

        // Downscale slightly to save localStorage space (capped at 1000px width/height)
        const maxDim = 1000;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw original image
        ctx.drawImage(img, 0, 0, width, height);

        // Draw overlay stamp banner
        const fontSize = Math.max(14, Math.floor(width * 0.038));
        ctx.font = `bold ${fontSize}px monospace`;
        
        const now = new Date();
        const dateString = now.toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' });
        const timeString = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const stampText = `[ ${visitType.toUpperCase()} ]  ${dateString} ${timeString} - ${locationName.toUpperCase()}`;

        // Measure text size for exact background fill
        const textPadding = fontSize * 0.55;
        const textWidth = ctx.measureText(stampText).width;
        const bgWidth = textWidth + textPadding * 2.5;
        const bgHeight = fontSize + textPadding * 1.5;

        // Put stamp in the bottom-right corner with margin
        const margin = fontSize * 0.8;
        const x = width - bgWidth - margin;
        const y = height - bgHeight - margin;

        // Draw solid background pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        ctx.fillRect(x, y, bgWidth, bgHeight);

        // Draw colored indicator dot (green for On Duty, orange for 2nd Visit)
        ctx.fillStyle = visitType === 'On Duty' ? '#10B981' : '#F59E0B';
        ctx.beginPath();
        ctx.arc(x + textPadding + fontSize / 2, y + bgHeight / 2, fontSize * 0.28, 0, Math.PI * 2);
        ctx.fill();

        // Draw Stamp Text in crisp white
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(stampText, x + textPadding + fontSize * 1.2, y + bgHeight - textPadding * 1.05);

        // Export data URL
        const stampedBase64 = canvas.toDataURL('image/jpeg', 0.80);
        saveCapturedPhoto(stampedBase64);
      } catch (err) {
        console.error('Canvas processing failed, saving fallback', err);
        saveCapturedPhoto(imageSrc);
      }
    };

    img.onerror = () => {
      saveCapturedPhoto(imageSrc);
    };
  };

  const saveCapturedPhoto = (finalImageUrl: string) => {
    const timestampStr = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newPhoto: CapturedPhoto = {
      id: Date.now().toString(),
      imageUrl: finalImageUrl,
      timestamp: timestampStr,
      visitType,
      notes: notes.trim() || undefined,
      location: locationName.trim() || 'Active Site Patrol Point',
      createdAt: new Date().toISOString(),
    };

    setPhotos((prev) => [newPhoto, ...prev]);
    setIsProcessing(false);
    setPreviewImage(null);
    setNotes('');
    setSuccessMsg(`Successfully captured & stamped "${visitType}" verification report!`);
    
    setTimeout(() => {
      setSuccessMsg('');
    }, 4500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPreviewImage(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTriggerUploadSnap = () => {
    playClickSound();
    if (!previewImage) return;
    processImageAndStamp(previewImage);
  };

  const handleLoadSamplePhoto = () => {
    playClickSound();
    // Select a random sample photo for easy testing
    const randomIndex = Math.floor(Math.random() * SAMPLE_PHOTOS.length);
    const sample = SAMPLE_PHOTOS[randomIndex];
    setPreviewImage(sample.url);
    if (!locationName || locationName === 'Main Warehouse Gate') {
      setLocationName(sample.label);
    }
  };

  const handleDeletePhoto = (id: string) => {
    playClickSound();
    setPhotoToDelete(id);
  };

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const id = photoToDelete;
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selectedPhoto?.id === id) setSelectedPhoto(null);
    if (sharePhotoTarget?.id === id) setSharePhotoTarget(null);
    setPhotoToDelete(null);
    try {
      await fetch(`/api/photos/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Failed to delete photo from backend:", err);
    }
  };

  const getShareText = (photo: CapturedPhoto) => {
    return (
      `📋 *SECURITY PATROL VERIFICATION REPORT*\n` +
      `------------------------------------------\n` +
      `• *Route/Location:* ${photo.location || 'Active Patrol Point'}\n` +
      `• *Status:* [${photo.visitType.toUpperCase()}] ✅\n` +
      `• *Timestamp:* ${photo.timestamp}\n` +
      `• *Log Notes:* ${photo.notes || 'No facility incidents or breaches.'}\n` +
      `------------------------------------------\n` +
      `Verified via Security Guard Duty App`
    );
  };

  const handleNativeShare = async (photo: CapturedPhoto) => {
    try {
      if (navigator.share) {
        // Convert base64 data URL to actual file blob to share
        const blob = await fetch(photo.imageUrl).then((res) => res.blob());
        const file = new File([blob], `patrol-stamp-${photo.id}.jpg`, { type: 'image/jpeg' });
        
        const shareData: ShareData = {
          title: `Patrol Report: ${photo.location}`,
          text: `Patrol verification stamp: ${photo.location} (${photo.visitType})`,
          files: [file]
        };

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share(shareData);
          return;
        }
      }
      
      // Fallback if file sharing not allowed but native share exists
      if (navigator.share) {
        await navigator.share({
          title: `Patrol Report: ${photo.location}`,
          text: getShareText(photo),
        });
        return;
      }
    } catch (e) {
      console.warn('Native sharing failed, opening direct fallback redirects...', e);
    }

    // Direct WhatsApp redirect as fallback
    handleWhatsAppShare(photo);
  };

  const handleWhatsAppShare = (photo: CapturedPhoto) => {
    const text = encodeURIComponent(getShareText(photo));
    const url = `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  };

  const handleEmailShare = (photo: CapturedPhoto) => {
    const subject = encodeURIComponent(`Security Patrol Verification - ${photo.location}`);
    const body = encodeURIComponent(getShareText(photo).replace(/\*/g, '')); // remove asterisks for plain emails
    const mailto = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto, '_self');
  };

  const handleCopyReportText = (photo: CapturedPhoto) => {
    const plainText = getShareText(photo).replace(/\*/g, ''); // strip bold markdown
    navigator.clipboard.writeText(plainText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div id="view-capture" className="flex-1 flex flex-col bg-white min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] pb-16 relative">
      <main className="flex-grow max-w-xl w-full mx-auto p-4 md:p-6 flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-black tracking-tight flex items-center gap-2">
              <Camera className="w-5 h-5 text-black" />
              On-Duty Capture
            </h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">
              Instant Timestamp & Verification Watermarking
            </p>
          </div>
        </div>

        {/* SUCCESS ALERTS */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-400 text-emerald-800 rounded-lg text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="font-semibold">{successMsg}</div>
          </div>
        )}

        {/* INPUT METADATA PANEL */}
        <div className="bg-red-50/20 border border-red-100 rounded-xl p-4 md:p-5 mb-6 space-y-4 shadow-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1.5">
                Location/Checkpoint Name *
              </label>
              <input
                type="text"
                required
                id="capture-location-input"
                placeholder="e.g. Main Warehouse Gate"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-black focus:outline-none text-xs text-black bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1.5">
                Visit Verification Type *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="visit-on-duty-btn"
                  onClick={() => { playClickSound(); setVisitType('On Duty'); }}
                  className={`py-1.5 px-3 text-xs font-semibold uppercase tracking-wider border rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    visitType === 'On Duty'
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-black border-gray-200 hover:border-red-600'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  On Duty
                </button>

                <button
                  type="button"
                  id="visit-2nd-visit-btn"
                  onClick={() => { playClickSound(); setVisitType('2nd Visit'); }}
                  className={`py-1.5 px-3 text-xs font-semibold uppercase tracking-wider border rounded transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    visitType === '2nd Visit'
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-black border-gray-200 hover:border-red-600'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  2nd Visit
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1">
              Field Patrol Notes / Inspection Observations (Optional)
            </label>
            <input
              type="text"
              id="capture-notes-input"
              placeholder="e.g. Area is secure, backup power supply check passed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-red-600 focus:outline-none text-xs text-black bg-white"
            />
          </div>
        </div>

        {/* DEVICE CAMERA TRIGGER AND FILE PREVIEW */}
        <div className="space-y-4">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {!previewImage ? (
            <div className="space-y-3">
              <button
                id="trigger-file-input-btn"
                onClick={() => { playClickSound(); fileInputRef.current?.click(); }}
                className="w-full h-36 border-2 border-dashed border-red-200/80 rounded-xl hover:border-red-600 transition-colors flex flex-col items-center justify-center text-center p-4 cursor-pointer group bg-red-50/20 shadow-xs"
              >
                <Camera className="w-8 h-8 text-gray-400 group-hover:text-red-600 transition-colors mb-2" />
                <span className="text-xs font-bold text-gray-700 group-hover:text-red-600">
                  Trigger Mobile Device Camera
                </span>
                <span className="text-[10px] text-gray-400 mt-1">
                  Drag & Drop or Tap to Upload Inspection Photo
                </span>
              </button>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadSamplePhoto}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:border-red-600 text-[10px] font-semibold uppercase tracking-wider rounded bg-white text-gray-600 hover:text-black transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Or load sample checkpoint image for desktop test
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden border border-black bg-black shadow-md">
                <img
                  src={previewImage}
                  alt="Inspection Preview"
                  className="w-full h-full object-contain"
                />
                <button
                  onClick={() => { playClickSound(); setPreviewImage(null); }}
                  className="absolute top-3 right-3 bg-red-600 text-white p-1.5 rounded-full hover:bg-red-700 transition-colors cursor-pointer"
                  title="Clear Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { playClickSound(); setPreviewImage(null); }}
                  className="flex-1 py-2 border border-gray-200 text-xs font-semibold uppercase tracking-wider rounded text-gray-600 hover:text-black hover:border-gray-400 transition-colors cursor-pointer"
                >
                  Clear & Retake
                </button>
                <button
                  id="submit-stamp-btn"
                  onClick={handleTriggerUploadSnap}
                  disabled={isProcessing}
                  className="flex-1 py-2 bg-red-600 border border-red-600 text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-red-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isProcessing ? 'Stamping GPS/Time...' : 'Generate Verified Stamp'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RECENT STAMP VERIFICATION RECORD CARD */}
        {photos.length > 0 && (
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Latest Stamp Verification Record
              </span>
            </div>

            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 flex flex-col sm:flex-row gap-4 hover:border-red-600 hover:bg-white transition-all shadow-xs">
              <div 
                onClick={() => setSelectedPhoto(photos[0])}
                className="w-full sm:w-24 h-24 rounded-lg overflow-hidden border border-gray-100 flex-shrink-0 bg-neutral-100 relative group cursor-pointer"
              >
                <img
                  src={photos[0].imageUrl}
                  alt="Recent verification stamp"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-5 h-5 text-white" />
                </div>

                {/* Delete overlay button - click on delete icon to remove pictures */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playClickSound();
                    handleDeletePhoto(photos[0].id);
                  }}
                  className="absolute top-1.5 right-1.5 z-20 p-1 bg-black/60 hover:bg-red-600/90 text-white rounded-full transition-all cursor-pointer backdrop-blur-xs flex items-center justify-center border border-white/10"
                  title="Delete verification stamp"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-grow flex flex-col justify-between py-0.5 space-y-3 sm:space-y-0">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest ${
                      photos[0].visitType === 'On Duty' 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' 
                        : 'bg-amber-50 text-amber-800 border border-amber-150'
                    }`}>
                      {photos[0].visitType}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      {photos[0].timestamp}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-black mt-2">
                    {photos[0].location}
                  </p>
                  {photos[0].notes && (
                    <p className="text-[11px] text-gray-500 italic mt-1 bg-gray-50 p-1.5 rounded border border-gray-100">
                      "{photos[0].notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                  <div className="text-[10px] text-gray-400 italic">
                    Saved directly to gallery logs
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        playClickSound();
                        handleWhatsAppShare(photos[0]);
                      }}
                      className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                      title="Share directly to WhatsApp with timestamp attached"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { playClickSound(); setSelectedPhoto(photos[0]); }}
                      className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded transition-colors"
                      title="View Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { playClickSound(); setSharePhotoTarget(photos[0]); }}
                      className="p-1.5 text-gray-500 hover:text-black hover:bg-gray-100 rounded transition-colors"
                      title="Share Options"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { playClickSound(); handleDeletePhoto(photos[0].id); }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete Report"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FULLSCREEN PHOTO VIEW MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 md:p-6 animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center text-white pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Verified Stamp Report
              </h3>
              <p className="text-sm font-bold text-white mt-0.5">{selectedPhoto.location}</p>
            </div>
            <button
              onClick={() => { playClickSound(); setSelectedPhoto(null); }}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stamped image container */}
          <div className="flex-grow flex items-center justify-center p-4">
            <img
              src={selectedPhoto.imageUrl}
              alt="Fullscreen Stamped Log"
              className="max-h-[70vh] max-w-full object-contain border border-neutral-800 shadow-2xl rounded"
            />
          </div>

          {/* Footer controls */}
          <div className="border-t border-neutral-800 pt-4 pb-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-neutral-300">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest ${
                    selectedPhoto.visitType === 'On Duty' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {selectedPhoto.visitType}
                  </span>
                  <span className="text-xs text-neutral-400 font-semibold">{selectedPhoto.timestamp}</span>
                </div>
                {selectedPhoto.notes && (
                  <p className="text-xs text-neutral-400 italic">"{selectedPhoto.notes}"</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { playClickSound(); handleWhatsAppShare(selectedPhoto); }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                  title="Share directly to WhatsApp with timestamp attached"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  WhatsApp
                </button>
                <button
                  onClick={() => { playClickSound(); setSharePhotoTarget(selectedPhoto); }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-black text-xs font-bold uppercase tracking-wider rounded hover:bg-neutral-200 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  Share Options
                </button>
                <button
                  onClick={() => { playClickSound(); handleDeletePhoto(selectedPhoto.id); }}
                  className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                  title="Delete verification stamp"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOCIAL SHARING ACTIONS DRAWER / MODAL */}
      {sharePhotoTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-black rounded-t-xl sm:rounded-xl shadow-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 mb-5">
              <div>
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Direct Report Redirect
                </h2>
                <h3 className="text-sm font-bold text-black mt-0.5">
                  Share Patrol Report
                </h3>
              </div>
              <button
                onClick={() => { playClickSound(); setSharePhotoTarget(null); }}
                className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* WhatsApp Redirection Button */}
              <button
                onClick={() => { playClickSound(); handleWhatsAppShare(sharePhotoTarget); }}
                className="w-full p-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs flex items-center justify-between transition-colors shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">💬</span>
                  <span className="uppercase tracking-wider">Share directly to WhatsApp</span>
                </div>
                <ExternalLink className="w-4 h-4" />
              </button>

              {/* Native Device Share */}
              <button
                onClick={() => { playClickSound(); handleNativeShare(sharePhotoTarget); }}
                className="w-full p-3.5 bg-black hover:bg-neutral-800 text-white rounded-lg font-semibold text-xs flex items-center justify-between transition-colors shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-4 h-4" />
                  <span className="uppercase tracking-wider">Use Mobile Native Share menu</span>
                </div>
                <ExternalLink className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* Copy report details */}
                <button
                  onClick={() => { playClickSound(); handleCopyReportText(sharePhotoTarget); }}
                  className="p-3 border border-gray-200 hover:border-black rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-2 transition-colors bg-white hover:bg-neutral-50 cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-black" />
                  <span className="text-black uppercase tracking-wider text-[10px]">
                    {isCopied ? 'Copied ✅' : 'Copy Log Text'}
                  </span>
                </button>

                {/* Email verification details */}
                <button
                  onClick={() => { playClickSound(); handleEmailShare(sharePhotoTarget); }}
                  className="p-3 border border-gray-200 hover:border-black rounded-lg text-xs font-semibold flex flex-col items-center justify-center gap-2 transition-colors bg-white hover:bg-neutral-50 cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-black" />
                  <span className="text-black uppercase tracking-wider text-[10px]">
                    Send Email Log
                  </span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mt-5 leading-normal text-center bg-gray-50 p-2 border border-gray-100 rounded">
              If using native share, compatible messaging programs (e.g. WhatsApp, Slack) allow sending the fully watermarked stamped image directly.
            </p>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE MODAL */}
      {photoToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white border border-neutral-800 rounded-xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <h3 className="text-sm font-extrabold text-black uppercase tracking-wider mb-2">
              Delete Verification Stamp?
            </h3>
            <p className="text-xs text-gray-500 leading-normal mb-5">
              Are you sure you want to delete this verified capture from the app? This action cannot be undone.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { playClickSound(); setPhotoToDelete(null); }}
                className="px-4 py-2 border border-gray-200 text-xs font-semibold uppercase tracking-wider rounded text-gray-600 hover:text-black hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeletePhoto}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
