import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, ImagePlus, Loader2 } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useCommunity } from '../contexts/CommunityContext';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
    const { createGroup, groups } = useCommunity();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [nameError, setNameError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const ownedGroups = groups.filter(g => Object.values(g.members).some((m: any) => m.role === 'Owner'));

    const addTag = () => {
        const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
        if (!t || tags.includes(t) || tags.length >= 10) return;
        setTags(prev => [...prev, t]);
        setTagInput('');
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); }
        if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            setTags(prev => prev.slice(0, -1));
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        // 4A: File size limit (5MB)
        if (file.size > 5 * 1024 * 1024) {
            setUploadError('Image must be under 5MB');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setUploadError('');
        setUploadProgress(0);

        // Show local preview immediately
        const objectUrl = URL.createObjectURL(file);
        setImagePreview(objectUrl);

        // Sanitize filename: replace whitespace/special chars with underscores
        const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `groups/covers/${user.uid}/${Date.now()}_${sanitized}`;
        const storageRef = ref(storage, storagePath);

        setUploading(true);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                setUploadProgress(pct);
            },
            (err) => {
                setUploading(false);
                setImagePreview('');
                setUploadError(err.message || 'Upload failed. Please try again.');
            },
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                setImage(url);
                setUploading(false);
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !description || submitting || uploading) return;
        setNameError('');
        setSubmitting(true);
        const err = await createGroup(name, description, image || `https://picsum.photos/seed/${name.replace(/\s+/g, '')}/400/300`, tags);
        setSubmitting(false);
        if (err) { setNameError(err); return; }
        setName('');
        setDescription('');
        setImage('');
        setImagePreview('');
        setTags([]);
        setTagInput('');
        setNameError('');
        setUploadError('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="create-group-modal-title"
                    className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-700 w-full max-w-md z-10 flex flex-col"
                >
                    <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h2 id="create-group-modal-title" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Create Group</h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{ownedGroups.length}/3 groups owned</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Group Name</label>
                            <input
                                type="text"
                                required
                                maxLength={60}
                                value={name}
                                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                                placeholder="e.g. Local Husky Walkers"
                                className={`w-full px-4 py-2 rounded-xl border bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 transition-colors ${nameError ? 'border-rose-400 focus:ring-rose-400' : 'border-neutral-200 dark:border-neutral-600 focus:ring-emerald-500'}`}
                            />
                            {name.length > 40 && (
                                <p className="text-xs text-neutral-400 mt-1">{name.length}/60 characters</p>
                            )}
                            {nameError && <p className="text-xs text-rose-500 mt-1">{nameError}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Description</label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What is this group about?"
                                rows={3}
                                className="w-full px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors resize-none"
                            />
                        </div>

                        {/* Cover Photo Upload */}
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                Cover Photo <span className="text-neutral-400 font-normal">(Optional)</span>
                            </label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            {imagePreview ? (
                                <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-600">
                                    <img
                                        src={imagePreview}
                                        alt="Cover preview"
                                        className="w-full h-32 object-cover"
                                    />
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                                            <span className="text-white text-sm font-medium">{uploadProgress}%</span>
                                        </div>
                                    )}
                                    {!uploading && (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white text-xs px-2.5 py-1 rounded-lg transition-colors"
                                        >
                                            Change
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-24 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700/50 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-colors group"
                                >
                                    <ImagePlus className="w-6 h-6 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                                    <span className="text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        Upload cover photo
                                    </span>
                                </button>
                            )}
                            {uploadError && <p className="text-xs text-rose-500 mt-1">{uploadError}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                Search Tags <span className="text-neutral-400 font-normal">({tags.length}/10)</span>
                            </label>
                            <div className="flex flex-wrap gap-1.5 p-2 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 min-h-[2.75rem] focus-within:ring-2 focus-within:ring-emerald-500">
                                {tags.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-medium px-2 py-0.5 rounded-full">
                                        #{tag}
                                        <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))} className="hover:text-rose-600 transition-colors leading-none">&times;</button>
                                    </span>
                                ))}
                                {tags.length < 10 && (
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={e => setTagInput(e.target.value)}
                                        onKeyDown={handleTagKeyDown}
                                        onBlur={addTag}
                                        placeholder={tags.length === 0 ? 'e.g. dogs, local, hiking...' : ''}
                                        className="flex-1 min-w-[120px] text-sm text-neutral-900 dark:text-neutral-100 bg-transparent outline-none placeholder:text-neutral-400"
                                    />
                                )}
                            </div>
                            <p className="text-xs text-neutral-400 mt-1">Press Enter or comma to add a tag</p>
                        </div>

                        <button
                            type="submit"
                            disabled={ownedGroups.length >= 3 || !name || !description || submitting || uploading}
                            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-600 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
                        >
                            {uploading ? 'Uploading photo...' : submitting ? 'Checking...' : 'Create Group'}
                        </button>
                        {ownedGroups.length >= 3 && (
                            <p className="text-center text-xs text-rose-500 mt-2">You have reached the maximum number of owned groups (3).</p>
                        )}
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
