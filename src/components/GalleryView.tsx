import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Trash2, Download, Calendar, Tag, X, AlertCircle, Share2, Copy, Mail, ExternalLink } from 'lucide-react';
import { CapturedPhoto } from '../types';
import { playClickSound } from '../utils/sound';

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.459 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface GalleryViewProps {
  onHideBottomNavChange?: (hide: boolean) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ onHideBottomNavChange }) => {
  const [photos, setPhotos] = useState<CapturedPhoto[]>(() => {
    try {
      const saved = localStorage.getItem('captured_photos_data');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);
  const [sharePhotoTarget, setSharePhotoTarget] = useState<CapturedPhoto | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Notify parent layout on fullscreen view changes
  useEffect(() => {
    onHideBottomNavChange?.(selectedPhoto !== null);
  }, [selectedPhoto, onHideBottomNavChange]);

  // Sync state back to local storage if items are deleted
  useEffect(() => {
    try {
      localStorage.setItem('captured_photos_data', JSON.stringify(photos));
    } catch (e) {
      console.error(e);
    }
  }, [photos]);

  const handleDeletePhoto = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // prevent modal trigger
    playClickSound();
    setPhotoToDelete(id);
  };

  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const id = photoToDelete;
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selectedPhoto?.id === id) {
      setSelectedPhoto(null);
    }
    if (sharePhotoTarget?.id === id) {
      setSharePhotoTarget(null);
    }
    setPhotoToDelete(null);
    try {
      await fetch(`/api/photos/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Failed to delete photo from backend:", err);
    }
  };

  const handleDownloadPhoto = (photo: CapturedPhoto, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // prevent modal trigger
    playClickSound();
    try {
      const link = document.createElement('a');
      link.href = photo.imageUrl;
      link.download = `PatrolCapture_${photo.visitType.replace(/\s+/g, '')}_${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download image", err);
    }
  };

  const handleClearAllPhotos = () => {
    playClickSound();
    setShowClearConfirm(true);
  };

  const handleConfirmClearAllPhotos = () => {
    setShowClearConfirm(false);
    setPhotos([]);
    setSelectedPhoto(null);
    setSharePhotoTarget(null);
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
      
      // Fallback text share
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
    <div id="view-gallery" className="flex-1 flex flex-col bg-white min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] pb-16 relative">
      <main className="flex-grow max-w-xl w-full mx-auto p-4 md:p-6 flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
          <div>
            <h1 className="text-xl font-semibold text-black tracking-tight flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-black" />
              Inspection Gallery
            </h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">
              Verified Stamped Evidence Logs ({photos.length})
            </p>
          </div>


        </div>

        {/* GALLERY GRID */}
        {photos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-12">
            <div className="mb-4 p-6 border border-black rounded-full bg-white">
              <ImageIcon className="w-10 h-10 text-black stroke-[1.5]" />
            </div>
            <h2 className="text-xl font-bold tracking-tight mb-2 text-black uppercase">
              No Photos Saved
            </h2>
            <p className="text-gray-400 font-normal max-w-xs text-sm mb-6 leading-relaxed">
              Use the Capture tab to snap watermarked photos of your shift. Saved records will appear here as permanent proof of duty.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 md:gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                id={`gallery-item-${photo.id}`}
                onClick={() => { playClickSound(); setSelectedPhoto(photo); }}
                className="group relative border border-gray-200 rounded-xl overflow-hidden bg-white cursor-pointer shadow-xs hover:border-red-600 transition-all flex flex-col"
              >
                {/* Image Wrap */}
                <div className="aspect-square relative overflow-hidden bg-neutral-950">
                  <img
                    src={photo.imageUrl}
                    alt={photo.location || 'Verification snapshot'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Badge overlay */}
                  <div className="absolute top-2.5 left-2.5 flex gap-1 z-10">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest ${
                      photo.visitType === 'On Duty' 
                        ? 'bg-red-600 text-white' 
                        : 'bg-amber-500 text-white'
                    }`}>
                      {photo.visitType}
                    </span>
                  </div>

                  {/* Delete overlay button - click on delete icon to remove pictures */}
                  <button
                    onClick={(e) => handleDeletePhoto(photo.id, e)}
                    className="absolute top-2.5 right-2.5 z-20 p-1.5 bg-black/60 hover:bg-red-600/90 text-white hover:text-white rounded-full transition-all cursor-pointer backdrop-blur-xs flex items-center justify-center border border-white/10"
                    title="Delete verification stamp"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Meta details */}
                <div className="p-3 flex-grow flex flex-col justify-between space-y-2">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-black line-clamp-1 uppercase tracking-tight">
                      {photo.location || 'General Patrol Point'}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold line-clamp-1">
                      {photo.timestamp}
                    </p>
                  </div>

                  {photo.notes && (
                    <p className="text-[10px] text-gray-500 italic line-clamp-1 border-t border-gray-50 pt-1">
                      "{photo.notes}"
                    </p>
                  )}

                  <div className="flex justify-end gap-1.5 pt-1.5 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        handleWhatsAppShare(photo);
                      }}
                      className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                      title="Share directly to WhatsApp"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playClickSound();
                        setSharePhotoTarget(photo);
                      }}
                      className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-colors"
                      title="Share Options"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDownloadPhoto(photo, e)}
                      className="p-1.5 text-gray-400 hover:text-black hover:bg-gray-100 rounded transition-colors"
                      title="Download image"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeletePhoto(photo.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete verification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HIGH-FIDELITY IMMERSIVE FULL SCREEN VIEW MODAL */}
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

            {/* Photo core rendering */}
            <div className="flex-grow flex items-center justify-center p-4">
              <img
                src={selectedPhoto.imageUrl}
                alt="Fullscreen Stamped Log"
                className="max-h-[70vh] max-w-full object-contain border border-neutral-800 shadow-2xl rounded"
              />
            </div>

            {/* Footer with actions */}
            <div className="border-t border-neutral-800 pt-4 pb-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-neutral-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest ${
                      selectedPhoto.visitType === 'On Duty' ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-amber-950 text-amber-400'
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
                    className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                    title="WhatsApp Share"
                  >
                    <WhatsAppIcon className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => { playClickSound(); setSharePhotoTarget(selectedPhoto); }}
                    className="p-2.5 bg-white text-black hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                    title="Share Options"
                  >
                    <Share2 className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => { playClickSound(); handleDownloadPhoto(selectedPhoto); }}
                    className="p-2.5 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center"
                    title="Download Photo"
                  >
                    <Download className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => { playClickSound(); handleDeletePhoto(selectedPhoto.id); }}
                    className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                    title="Delete Photo"
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
                {/* WhatsApp Direct Link Redirection */}
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
      </main>

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

      {/* CUSTOM CONFIRM CLEAR ALL MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white border border-neutral-800 rounded-xl shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-600" />
            
            <h3 className="text-sm font-extrabold text-black uppercase tracking-wider mb-2">
              Clear Media Gallery?
            </h3>
            <p className="text-xs text-gray-500 leading-normal mb-5">
              Are you sure you want to clear the entire patrol media gallery? This will permanently delete all captured evidence on this device.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { playClickSound(); setShowClearConfirm(false); }}
                className="px-4 py-2 border border-gray-200 text-xs font-semibold uppercase tracking-wider rounded text-gray-600 hover:text-black hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearAllPhotos}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
