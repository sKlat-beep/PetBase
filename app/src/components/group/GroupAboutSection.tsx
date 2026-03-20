import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { updateGroupBannerUrl } from '../../lib/firestoreService';
import { uploadGroupBanner } from '../../lib/storageService';

interface GroupAboutSectionProps {
  group: { id: string; name: string; description: string; image?: string };
  userRole: string | null;
  userId?: string;
  groupId: string;
}

export function GroupAboutSection({ group, userRole, userId, groupId }: GroupAboutSectionProps) {
  const [isAboutExpanded, setIsAboutExpanded] = useState(() => {
    return localStorage.getItem(`petbase_group_about_${groupId}`) !== 'false';
  });
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadProgress(0);
    try {
      const url = await uploadGroupBanner(group.id, userId, file, setUploadProgress);
      await updateGroupBannerUrl(group.id, url);
    } finally {
      setUploadProgress(null);
      if (bannerInputRef.current) bannerInputRef.current.value = '';
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden shadow-sm border border-outline-variant">
      <div className="relative h-32 w-full group/banner">
        {group.image ? (
          <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary to-emerald-600" />
        )}
        {userRole === 'Owner' && (
          <>
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center justify-center">
              <button type="button" onClick={() => bannerInputRef.current?.click()} className="bg-white/90 text-on-surface text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-white transition-colors">
                <span className="material-symbols-outlined text-[14px]">photo_camera</span> Change Banner
              </button>
            </div>
            {uploadProgress !== null && (
              <div className="absolute bottom-2 left-2 right-2 bg-black/50 rounded px-2 py-1">
                <div className="h-1 bg-primary rounded" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
          </>
        )}
      </div>
      <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
      <button
        onClick={() => {
          const next = !isAboutExpanded;
          setIsAboutExpanded(next);
          localStorage.setItem(`petbase_group_about_${groupId}`, String(next));
        }}
        className="w-full p-4 flex items-center justify-between hover:bg-surface-container transition-colors"
      >
        <div className="flex items-center gap-3">
          {group.image ? (
            <img src={group.image} alt={group.name} className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-emerald-600" />
          )}
          <h3 className="font-bold text-on-surface">About Group</h3>
        </div>
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
          {isAboutExpanded ? 'expand_less' : 'expand_more'}
        </span>
      </button>
      <AnimatePresence>
        {isAboutExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="p-5 pt-2 border-t border-outline-variant">
              <p className="text-sm text-on-surface-variant">{group.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
