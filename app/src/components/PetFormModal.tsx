import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, PawPrint, Info, Heart, Stethoscope, Image as ImageIcon, Camera, ChevronLeft, ChevronRight, Save, HeartPulse, Phone, Copy, Eye, Images } from 'lucide-react';
import type { Pet, EmergencyContacts } from '../types/pet';
import { usePets } from '../contexts/PetContext';
import { ImageCropperModal, getCroppedImg } from './ImageCropperModal';
import { useAuth } from '../contexts/AuthContext';
import { uploadPetProfilePhoto } from '../lib/storageService';

const NOTES_MAX = 5000;

const PRESET_TAGS = ["Available for Playdates", "In Training", "Senior Pet", "Therapy Animal", "Reactive", "Needs Space", "Good with Kids"];

const PET_TYPES = [
  'Dog', 'Cat', 'Rabbit', 'Bird', 'Fish',
  'Reptile', 'Small Animal', 'Horse / Large Animal', 'Ferret', 'Other',
];

const TAB_ORDER: Tab[] = ['basic', 'details', 'health', 'emergency'];
const TAB_LABELS: Record<Tab, string> = {
  basic: 'Basic Info',
  details: 'Personality & Play',
  health: 'Health & Diet',
  emergency: 'Emergency Contacts',
};

interface PetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Pet, 'id'>) => void;
  pet?: Pet;
}

function getNotesCounterColor(count: number): string {
  if (count >= NOTES_MAX) return 'text-rose-600 dark:text-rose-400 font-semibold';
  if (count >= NOTES_MAX * 0.9) return 'text-amber-600 dark:text-amber-400';
  return 'text-neutral-400 dark:text-neutral-500';
}

type Tab = 'basic' | 'details' | 'health' | 'emergency';

// ─── Tag Input ───────────────────────────────────────────────────────────────
function TagInput({
  tags, input, onInputChange, onAdd, onRemove, placeholder,
}: {
  tags: string[];
  input: string;
  onInputChange: (v: string) => void;
  onAdd: (tag: string) => void;
  onRemove: (i: number) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.endsWith(',')) {
      const tag = val.slice(0, -1).trim();
      if (tag) { onAdd(tag); onInputChange(''); }
      else onInputChange('');
    } else {
      onInputChange(val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) { onAdd(input.trim()); onInputChange(''); }
    } else if (e.key === 'Backspace' && !input && tags.length) {
      onRemove(tags.length - 1);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 w-full px-3 py-2 min-h-[42px] rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 focus-within:ring-2 focus-within:ring-emerald-500 transition-colors cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium shrink-0">
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(i); }}
            className="text-emerald-600 dark:text-emerald-400 hover:text-rose-600 dark:hover:text-rose-400 leading-none"
            aria-label={`Remove ${tag}`}
          >×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input.trim()) { onAdd(input.trim()); onInputChange(''); }
        }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[100px] bg-transparent outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 text-sm"
      />
    </div>
  );
}

// ─── Number + Unit Input ──────────────────────────────────────────────────────
function UnitInput<U extends string>({
  value, unit, units, onValueChange, onUnitChange, placeholder,
}: {
  value: string;
  unit: U;
  units: readonly U[];
  onValueChange: (v: string) => void;
  onUnitChange: (u: U) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="number"
        min="0"
        step="any"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder ?? '0'}
        className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
      />
      <select
        value={unit}
        onChange={(e) => onUnitChange(e.target.value as U)}
        className="px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
      >
        {units.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseUnitStr(str: string, unitKeywords: string[], defaultUnit: string): [string, string] {
  if (!str) return ['', defaultUnit];
  const numMatch = str.match(/^([\d.]+)/);
  const num = numMatch ? numMatch[1] : '';
  const lower = str.toLowerCase();
  const matched = unitKeywords.find(u => lower.includes(u.toLowerCase()));
  return [num, matched ?? defaultUnit];
}

function calcAgeFromBirthday(birthday: string): string {
  if (!birthday) return '';
  const birth = new Date(birthday);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const totalMonths = years * 12 + months;
  if (totalMonths < 1) return 'Less than a month';
  if (totalMonths < 12) return `${totalMonths} month${totalMonths !== 1 ? 's' : ''}`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m > 0 ? `${y} yr ${m} mo` : `${y} year${y !== 1 ? 's' : ''}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PetFormModal({ isOpen, onClose, onSave, pet }: PetFormModalProps) {
  const isEditMode = !!pet;
  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [isDirty, setIsDirty] = useState(false);
  const { pets: allPets } = usePets();
  const { user } = useAuth() as { user: { uid: string } | null };

  // Basic Info
  const [name, setName] = useState('');
  const [petType, setPetType] = useState('');
  const [customPetType, setCustomPetType] = useState('');
  const [breed, setBreed] = useState('');
  const [birthday, setBirthday] = useState('');
  const [weightNum, setWeightNum] = useState('');
  const [weightUnit, setWeightUnit] = useState<'lbs' | 'kg'>('lbs');
  const [image, setImage] = useState('');
  const [avatarShape, setAvatarShape] = useState<'circle' | 'square' | 'squircle' | 'hexagon'>('circle');
  const [backgroundColor, setBackgroundColor] = useState('#fbbf24');
  const [isPrivate, setIsPrivate] = useState(false);

  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Details — Tag inputs
  const [likeTags, setLikeTags] = useState<string[]>([]);
  const [likeInput, setLikeInput] = useState('');
  const [dislikeTags, setDislikeTags] = useState<string[]>([]);
  const [dislikeInput, setDislikeInput] = useState('');
  const [activityTags, setActivityTags] = useState<string[]>([]);
  const [activityInput, setActivityInput] = useState('');
  const [typeOfPlay, setTypeOfPlay] = useState('');
  const [activity, setActivity] = useState('');

  // Health & Diet
  const [heightNum, setHeightNum] = useState('');
  const [heightUnit, setHeightUnit] = useState<'inches' | 'cm'>('inches');
  const [lengthNum, setLengthNum] = useState('');
  const [lengthUnit, setLengthUnit] = useState<'inches' | 'cm'>('inches');
  const [bodyConditionScore, setBodyConditionScore] = useState('');
  const [spayedNeutered, setSpayedNeutered] = useState<'Yes' | 'No' | 'Unknown' | ''>('');
  const [microchipId, setMicrochipId] = useState('');
  const [foodBrand, setFoodBrand] = useState('');
  const [foodAmount, setFoodAmount] = useState('');
  const [foodUnit, setFoodUnit] = useState<'cups' | 'half cups' | 'oz' | 'grams' | 'lbs'>('cups');
  const [notes, setNotes] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContacts | undefined>();
  const [statusTags, setStatusTags] = useState<string[]>([]);

  // Visibility field toggles (Task 2b)
  const [publicFields, setPublicFields] = useState<string[]>([]);

  const mark = () => setIsDirty(true);

  // Populate state when modal opens / pet changes
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('basic');
    setIsDirty(false);

    setName(pet?.name ?? '');
    const savedType = pet?.type ?? '';
    if (!savedType || PET_TYPES.includes(savedType)) {
      setPetType(savedType); setCustomPetType('');
    } else {
      setPetType('Other'); setCustomPetType(savedType);
    }
    setBreed(pet?.breed ?? '');
    setBirthday(pet?.birthday ?? '');
    setImage(pet?.image ?? '');
    setAvatarShape(pet?.avatarShape ?? 'circle');
    setBackgroundColor(pet?.backgroundColor ?? '#fbbf24');
    setIsPrivate(pet?.isPrivate ?? false);
    // Weight: prefer weightUnit from pet, else parse from weight string
    const [wNum, wUnit] = pet?.weightUnit
      ? [pet.weight?.replace(/[^0-9.]/g, '') ?? '', pet.weightUnit]
      : parseUnitStr(pet?.weight ?? '', ['kg', 'lbs', 'lb'], 'lbs');
    setWeightNum(wNum); setWeightUnit(wUnit as 'lbs' | 'kg');

    // Tags
    setLikeTags(pet?.likes ?? []); setLikeInput('');
    setDislikeTags(pet?.dislikes ?? []); setDislikeInput('');
    setActivityTags(pet?.favoriteActivities ?? []); setActivityInput('');
    setTypeOfPlay(pet?.typeOfPlay ?? '');
    setActivity(pet?.activity ?? '');

    // Height/Length
    const [hNum, hUnit] = pet?.heightUnit
      ? [pet.height?.replace(/[^0-9.]/g, '') ?? '', pet.heightUnit]
      : parseUnitStr(pet?.height ?? '', ['cm', 'inches', 'inch', 'in'], 'inches');
    setHeightNum(hNum); setHeightUnit(hUnit as 'inches' | 'cm');

    const [lNum, lUnit] = pet?.lengthUnit
      ? [pet.length?.replace(/[^0-9.]/g, '') ?? '', pet.lengthUnit]
      : parseUnitStr(pet?.length ?? '', ['cm', 'inches', 'inch', 'in'], 'inches');
    setLengthNum(lNum); setLengthUnit(lUnit as 'inches' | 'cm');

    setBodyConditionScore(pet?.bodyConditionScore ?? '');
    setSpayedNeutered(pet?.spayedNeutered ?? '');
    setMicrochipId(pet?.microchipId ?? '');

    // Diet
    setFoodBrand(pet?.foodBrand ?? pet?.food ?? '');
    setFoodAmount(pet?.foodAmount ?? '');
    setFoodUnit((pet?.foodUnit ?? 'cups') as typeof foodUnit);
    setNotes(pet?.notes ?? '');
    setEmergencyContacts(pet?.emergencyContacts);
    setStatusTags(pet?.statusTags ?? []);
    setPublicFields(pet ? (pet.publicFields ?? []) : ['name', 'type', 'breed', 'age', 'image']);
  }, [isOpen, pet]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= NOTES_MAX) { setNotes(e.target.value); mark(); }
  };

  const handleSubmit = (action: 'save' | 'finish') => {
    if (!name.trim()) {
      setActiveTab('basic');
      return;
    }

    const finalImage = image.trim() || '';

    // Finish any pending tag inputs
    const finalLikes = likeInput.trim() ? [...likeTags, likeInput.trim()] : likeTags;
    const finalDislikes = dislikeInput.trim() ? [...dislikeTags, dislikeInput.trim()] : dislikeTags;
    const finalActivities = activityInput.trim() ? [...activityTags, activityInput.trim()] : activityTags;

    const weightStr = weightNum ? `${weightNum} ${weightUnit}` : '';
    const heightStr = heightNum ? `${heightNum} ${heightUnit}` : '';
    const lengthStr = lengthNum ? `${lengthNum} ${lengthUnit}` : '';
    const foodStr = [foodBrand, foodAmount ? `${foodAmount} ${foodUnit}/day` : ''].filter(Boolean).join(' · ');

    onSave({
      name: name.trim(),
      type: petType === 'Other' ? (customPetType.trim() || 'Other') : petType || undefined,
      breed: breed.trim(),
      age: birthday ? calcAgeFromBirthday(birthday) : (pet?.age ?? ''),
      birthday,
      weight: weightStr,
      weightUnit: weightNum ? weightUnit : undefined,
      image: finalImage,
      avatarShape,
      pageLayout: 'solid-color',
      backgroundColor,
      isPrivate,
      likes: finalLikes,
      dislikes: finalDislikes,
      favoriteActivities: finalActivities,
      typeOfPlay: typeOfPlay.trim(),
      activity: activity.trim(),
      height: heightStr,
      heightUnit: heightNum ? heightUnit : undefined,
      length: lengthStr,
      lengthUnit: lengthNum ? lengthUnit : undefined,
      bodyConditionScore: bodyConditionScore.trim(),
      spayedNeutered: spayedNeutered || undefined,
      microchipId: microchipId.trim() || undefined,
      food: foodStr,
      foodBrand: foodBrand.trim() || undefined,
      foodAmount: foodAmount.trim() || undefined,
      foodUnit: (foodAmount.trim() ? foodUnit : undefined) as any,
      notes,
      emergencyContacts,
      dietSchedule: pet?.dietSchedule ?? [],
      medicalVisits: pet?.medicalVisits ?? [],
      statusTags: statusTags.length > 0 ? statusTags : undefined,
      publicFields: publicFields.filter(k => !['microchipId', 'notes', 'emergencyContacts', 'medicalVisits'].includes(k)),
    });
    setIsDirty(false);

    const shouldClose = !isEditMode || action === 'finish';
    if (shouldClose) {
      onClose();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setSelectedImage(reader.result?.toString() || '');
        setShowCropper(true);
      });
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCropComplete = async (croppedAreaPixels: any) => {
    try {
      const croppedImageBlobUrl = await getCroppedImg(selectedImage, croppedAreaPixels);
      const uid = user?.uid;
      if (!uid) { setShowCropper(false); return; }
      const tempId = pet?.id ?? `new-${Date.now()}`;
      const storageUrl = await uploadPetProfilePhoto(uid, tempId, croppedImageBlobUrl);
      URL.revokeObjectURL(croppedImageBlobUrl);
      setImage(storageUrl);
      mark();
      setShowCropper(false);
    } catch (e) {
      console.error(e);
      setShowCropper(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const tabIdx = TAB_ORDER.indexOf(activeTab);
  const isFirst = tabIdx === 0;
  const isLast = tabIdx === TAB_ORDER.length - 1;
  const goNext = () => !isLast && setActiveTab(TAB_ORDER[tabIdx + 1]);
  const goPrev = () => !isFirst && setActiveTab(TAB_ORDER[tabIdx - 1]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onMouseDown={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pet-form-modal-title"
            className="relative bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-100 dark:border-neutral-700 w-full max-w-3xl z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-neutral-100 dark:border-neutral-700 shrink-0">
              <div className="flex items-center gap-2">
                <PawPrint className="w-5 h-5 text-emerald-600" />
                <h2 id="pet-form-modal-title" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  {isEditMode ? `Edit ${pet.name}` : 'Add a Pet'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs — Desktop */}
            <div className="hidden sm:flex border-b border-neutral-100 dark:border-neutral-700 px-6 shrink-0">
              {TAB_ORDER.map((tab) => {
                const Icon = tab === 'basic' ? Info : tab === 'details' ? Heart : tab === 'health' ? Stethoscope : tab === 'emergency' ? Phone : Camera;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {TAB_LABELS[tab]}
                  </button>
                );
              })}
            </div>

            {/* Tabs — Mobile: Left/Right arrow navigation */}
            <div className="flex sm:hidden items-center border-b border-neutral-100 dark:border-neutral-700 px-4 py-3 shrink-0 gap-3">
              <button
                type="button"
                onClick={goPrev}
                disabled={isFirst}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{TAB_LABELS[activeTab]}</span>
                <span className="text-xs text-neutral-400 dark:text-neutral-500 ml-2">({tabIdx + 1}/{TAB_ORDER.length})</span>
              </div>
              <button
                type="button"
                onClick={goNext}
                disabled={isLast}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto flex-1 space-y-5">

                {/* ── Basic Info ── */}
                {activeTab === 'basic' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-5"
                  >
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => { setName(e.target.value); mark(); }}
                        placeholder="e.g. Max"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Pet Type
                      </label>
                      <select
                        value={petType}
                        onChange={(e) => { setPetType(e.target.value); if (e.target.value !== 'Other') setCustomPetType(''); mark(); }}
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                      >
                        <option value="">Select type...</option>
                        {PET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {petType === 'Other' && (
                        <input
                          type="text"
                          value={customPetType}
                          onChange={(e) => { setCustomPetType(e.target.value); mark(); }}
                          placeholder="e.g. Bearded Dragon, Axolotl, Tarantula…"
                          className="mt-2 w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Breed
                      </label>
                      <input
                        type="text"
                        value={breed}
                        onChange={(e) => { setBreed(e.target.value); mark(); }}
                        placeholder="e.g. Golden Retriever"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Birthday
                      </label>
                      <input
                        type="date"
                        value={birthday}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={(e) => { setBirthday(e.target.value); mark(); }}
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                      />
                      {birthday && (
                        <p className="text-xs text-neutral-400 mt-1">Age: {calcAgeFromBirthday(birthday)}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Weight
                      </label>
                      <UnitInput
                        value={weightNum}
                        unit={weightUnit}
                        units={['lbs', 'kg'] as const}
                        onValueChange={(v) => { setWeightNum(v); mark(); }}
                        onUnitChange={(u) => { setWeightUnit(u); mark(); }}
                        placeholder="0"
                      />
                    </div>

                    {/* Profile Photo & Appearance */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Profile Photo & Appearance
                      </label>
                      <div className="flex flex-col sm:flex-row gap-6 bg-neutral-50 dark:bg-neutral-700/30 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                        {/* Preview */}
                        <div
                          className="flex flex-col items-center justify-center p-4 rounded-xl shrink-0 w-36 h-36 relative overflow-hidden transition-all duration-300"
                          style={{ backgroundColor }}
                        >
                          <div className="relative group z-10 w-full h-full flex items-center justify-center">
                            <div className={`w-24 h-24 bg-neutral-200 dark:bg-neutral-600 overflow-hidden shrink-0 ${avatarShape === 'circle' ? 'rounded-full' : avatarShape === 'square' ? 'rounded-xl' : avatarShape === 'squircle' ? 'rounded-[2rem]' : 'rounded-full'} shadow-xl transition-all duration-300 border-2 border-white/20`}>
                              {image ? (
                                <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                  <ImageIcon className="w-8 h-8" />
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute inset-[15%] bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              style={{
                                borderRadius: avatarShape === 'circle' ? '9999px' : avatarShape === 'square' ? '0.75rem' : avatarShape === 'squircle' ? '2rem' : '0',
                                clipPath: avatarShape === 'hexagon' ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' : undefined
                              }}
                            >
                              <Camera className="w-6 h-6" />
                              <span className="text-xs font-medium mt-1">Upload</span>
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                          </div>
                        </div>

                        <div className="flex-1 space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Avatar Shape</label>
                            <div className="flex flex-wrap gap-2">
                              {(['circle', 'square', 'squircle'] as const).map(shape => (
                                <button
                                  key={shape}
                                  type="button"
                                  onClick={() => { setAvatarShape(shape); mark(); }}
                                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors font-medium border ${avatarShape === shape ? 'bg-white dark:bg-neutral-600 text-neutral-900 dark:text-neutral-100 shadow-sm border-neutral-200 dark:border-neutral-500' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'}`}
                                >
                                  {shape}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Background Color</label>
                            <div className="flex flex-wrap gap-2">
                              {['#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635',
                                '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8',
                                '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9',
                                '#f472b6', '#fb7185', '#94a3b8', '#a8a29e', '#1c1917'].map(color => (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() => { setBackgroundColor(color); mark(); }}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${backgroundColor === color ? 'border-white dark:border-neutral-800 shadow-sm ring-2 ring-emerald-500 scale-110' : 'border-transparent shadow-sm'}`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/50">
                            <label className="flex items-center justify-between cursor-pointer">
                              <div>
                                <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">Private Profile</span>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Hide this pet from the public community.</p>
                              </div>
                              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPrivate ? 'bg-emerald-600' : 'bg-neutral-200 dark:bg-neutral-700'}`}>
                                <input type="checkbox" className="sr-only" checked={isPrivate} onChange={(e) => { setIsPrivate(e.target.checked); mark(); }} />
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-1'}`} />
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 flex items-center gap-1">
                      <Images className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Manage photos in the <button type="button" onClick={onClose} className="underline hover:text-emerald-600">Photo Library</button> on My Pets.
                    </p>
                  </motion.div>
                )}

                {/* ── Personality & Play ── */}
                {activeTab === 'details' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-1 gap-5"
                  >
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Likes <span className="text-xs text-neutral-400 font-normal">(type then press Enter or comma)</span>
                      </label>
                      <TagInput
                        tags={likeTags}
                        input={likeInput}
                        onInputChange={(v) => { setLikeInput(v); mark(); }}
                        onAdd={(t) => { setLikeTags(prev => [...prev, t]); mark(); }}
                        onRemove={(i) => { setLikeTags(prev => prev.filter((_, idx) => idx !== i)); mark(); }}
                        placeholder="e.g. Belly rubs, Tennis balls…"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Dislikes <span className="text-xs text-neutral-400 font-normal">(type then press Enter or comma)</span>
                      </label>
                      <TagInput
                        tags={dislikeTags}
                        input={dislikeInput}
                        onInputChange={(v) => { setDislikeInput(v); mark(); }}
                        onAdd={(t) => { setDislikeTags(prev => [...prev, t]); mark(); }}
                        onRemove={(i) => { setDislikeTags(prev => prev.filter((_, idx) => idx !== i)); mark(); }}
                        placeholder="e.g. Vacuum cleaner, Thunder…"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        Favorite Activities <span className="text-xs text-neutral-400 font-normal">(type then press Enter or comma)</span>
                      </label>
                      <TagInput
                        tags={activityTags}
                        input={activityInput}
                        onInputChange={(v) => { setActivityInput(v); mark(); }}
                        onAdd={(t) => { setActivityTags(prev => [...prev, t]); mark(); }}
                        onRemove={(i) => { setActivityTags(prev => prev.filter((_, idx) => idx !== i)); mark(); }}
                        placeholder="e.g. Swimming, Hiking, Fetch…"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                          Type of Play
                        </label>
                        <input
                          type="text"
                          value={typeOfPlay}
                          onChange={(e) => { setTypeOfPlay(e.target.value); mark(); }}
                          placeholder="e.g. Rough, Gentle, Independent"
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                          Activity Level
                        </label>
                        <select
                          value={activity}
                          onChange={(e) => { setActivity(e.target.value); mark(); }}
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                        >
                          <option value="">Select level...</option>
                          <option value="Low">Low (Couch Potato)</option>
                          <option value="Moderate">Moderate (Daily Walks)</option>
                          <option value="High">High (Very Active)</option>
                          <option value="Very High">Very High (Working/Athlete)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Status Tags
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {PRESET_TAGS.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setStatusTags(prev =>
                                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                              );
                              mark();
                            }}
                            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                              statusTags.includes(tag)
                                ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400'
                                : 'bg-neutral-100 dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-emerald-400'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-neutral-400">Click to toggle. Tags appear on your pet's profile.</p>
                    </div>
                  </motion.div>
                )}

                {/* ── Health & Diet ── */}
                {activeTab === 'health' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-5"
                  >
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Height</label>
                      <UnitInput
                        value={heightNum}
                        unit={heightUnit}
                        units={['inches', 'cm'] as const}
                        onValueChange={(v) => { setHeightNum(v); mark(); }}
                        onUnitChange={(u) => { setHeightUnit(u); mark(); }}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Length</label>
                      <UnitInput
                        value={lengthNum}
                        unit={lengthUnit}
                        units={['inches', 'cm'] as const}
                        onValueChange={(v) => { setLengthNum(v); mark(); }}
                        onUnitChange={(u) => { setLengthUnit(u); mark(); }}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Body Condition</label>
                      <select
                        value={bodyConditionScore}
                        onChange={(e) => { setBodyConditionScore(e.target.value); mark(); }}
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                      >
                        <option value="">Not set</option>
                        <option value="Underweight">Underweight</option>
                        <option value="Healthy weight">Healthy weight</option>
                        <option value="Overweight">Overweight</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Spayed / Neutered</label>
                      <select
                        value={spayedNeutered}
                        onChange={(e) => { setSpayedNeutered(e.target.value as typeof spayedNeutered); mark(); }}
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                      >
                        <option value="">Not set</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Unknown">Unknown</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Microchip ID</label>
                      <input
                        type="text"
                        value={microchipId}
                        onChange={(e) => { setMicrochipId(e.target.value); mark(); }}
                        placeholder="e.g. 985112345678901"
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                      />
                    </div>

                    {/* Primary Diet */}
                    <div className="sm:col-span-2 space-y-3">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Primary Diet</label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Food Brand / Type</label>
                          <input
                            type="text"
                            value={foodBrand}
                            onChange={(e) => { setFoodBrand(e.target.value); mark(); }}
                            placeholder="e.g. Purina Pro Plan"
                            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Amount</label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={foodAmount}
                            onChange={(e) => { setFoodAmount(e.target.value); mark(); }}
                            placeholder="0"
                            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">Unit</label>
                          <select
                            value={foodUnit}
                            onChange={(e) => { setFoodUnit(e.target.value as typeof foodUnit); mark(); }}
                            className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors text-sm"
                          >
                            <option value="cups">cups/day</option>
                            <option value="half cups">half cups/day</option>
                            <option value="oz">oz/day</option>
                            <option value="grams">grams/day</option>
                            <option value="lbs">lbs/day</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div className="sm:col-span-2 pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          Diet or Medical Notes{' '}
                          <span className="text-xs font-normal bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full ml-1">
                            Encrypted
                          </span>
                        </label>
                        <span className={`text-xs tabular-nums ${getNotesCounterColor(notes.length)}`}>
                          {notes.length.toLocaleString()} / {NOTES_MAX.toLocaleString()}
                        </span>
                      </div>
                      <textarea
                        value={notes}
                        onChange={handleNotesChange}
                        rows={5}
                        placeholder="Health notes, allergies, medications, behavioral observations..."
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors resize-none"
                      />
                      {notes.length >= NOTES_MAX && (
                        <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Character limit reached.</p>
                      )}
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        Health and medical context. Encrypted client-side before storage.
                      </p>
                    </div>

                  </motion.div>
                )}

                {/* ── Emergency Contacts ── */}
                {activeTab === 'emergency' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Vet info and emergency contacts for this pet.</p>
                      {allPets.length > 0 && allPets.some(p => p.id !== pet?.id && (p.emergencyContacts?.vetInfo?.clinic || p.emergencyContacts?.ownerPhone || p.emergencyContacts?.additionalContacts?.some(c => c.name))) && (
                        <div className="relative group/autofill">
                          <select
                            className="appearance-none pl-8 pr-4 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-300 cursor-pointer hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
                            value=""
                            onChange={(e) => {
                              const sourcePet = allPets.find(p => p.id === e.target.value);
                              if (sourcePet && sourcePet.emergencyContacts) {
                                setEmergencyContacts(sourcePet.emergencyContacts);
                                setIsDirty(true);
                              }
                            }}
                          >
                            <option value="" disabled>Autofill from...</option>
                            {allPets.filter(p => p.id !== pet?.id && p.emergencyContacts).map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                          <Copy className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 group-hover/autofill:text-emerald-500 pointer-events-none transition-colors" />
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                        <HeartPulse className="w-4 h-4 text-emerald-500" /> Vet Info
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Clinic Name</label>
                          <input type="text" value={emergencyContacts?.vetInfo?.clinic || ''} onChange={e => { setEmergencyContacts(prev => ({ ...prev, vetInfo: { ...prev?.vetInfo, clinic: e.target.value, name: prev?.vetInfo?.name || '', phone: prev?.vetInfo?.phone || '', address: prev?.vetInfo?.address || '' } })); setIsDirty(true); }} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-neutral-400" placeholder="Happy Paws Clinic" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Doctor Name</label>
                          <input type="text" value={emergencyContacts?.vetInfo?.name || ''} onChange={e => { setEmergencyContacts(prev => ({ ...prev, vetInfo: { ...prev?.vetInfo, name: e.target.value, clinic: prev?.vetInfo?.clinic || '', phone: prev?.vetInfo?.phone || '', address: prev?.vetInfo?.address || '' } })); setIsDirty(true); }} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-neutral-400" placeholder="Dr. Smith" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Vet Phone</label>
                          <input type="tel" value={emergencyContacts?.vetInfo?.phone || ''} onChange={e => { setEmergencyContacts(prev => ({ ...prev, vetInfo: { ...prev?.vetInfo, phone: e.target.value, clinic: prev?.vetInfo?.clinic || '', name: prev?.vetInfo?.name || '', address: prev?.vetInfo?.address || '' } })); setIsDirty(true); }} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-neutral-400" placeholder="(555) 000-0000" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Vet Address</label>
                          <input type="text" value={emergencyContacts?.vetInfo?.address || ''} onChange={e => { setEmergencyContacts(prev => ({ ...prev, vetInfo: { ...prev?.vetInfo, address: e.target.value, clinic: prev?.vetInfo?.clinic || '', name: prev?.vetInfo?.name || '', phone: prev?.vetInfo?.phone || '' } })); setIsDirty(true); }} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-neutral-400" placeholder="123 Vet Clinic Way" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Owner / Primary Phone</label>
                      <input
                        type="tel"
                        value={emergencyContacts?.ownerPhone || ''}
                        onChange={e => { setEmergencyContacts(prev => ({ ...prev, ownerPhone: e.target.value })); setIsDirty(true); }}
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-neutral-400"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div className="p-4 bg-neutral-50 dark:bg-neutral-700/50 rounded-xl space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-neutral-800 dark:text-neutral-200">
                        <Phone className="w-4 h-4 text-blue-500" /> Additional Contacts
                      </h4>
                      {[0, 1, 2].map(index => {
                        const contact = emergencyContacts?.additionalContacts?.[index] || { name: '', phone: '' };
                        const isHidden = index > 0 && !(emergencyContacts?.additionalContacts?.[index - 1]?.name || emergencyContacts?.additionalContacts?.[index - 1]?.phone);
                        if (isHidden && !contact.name && !contact.phone) return null;

                        return (
                          <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 first:pt-0">
                            <div>
                              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Contact {index + 1} Name</label>
                              <input type="text" value={contact.name} onChange={e => {
                                const newContacts = [...(emergencyContacts?.additionalContacts || [])];
                                newContacts[index] = { ...contact, name: e.target.value };
                                setEmergencyContacts(prev => ({ ...prev, additionalContacts: newContacts }));
                                setIsDirty(true);
                              }} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-neutral-400" placeholder="Jane Doe" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Contact {index + 1} Phone</label>
                              <input type="tel" value={contact.phone} onChange={e => {
                                const newContacts = [...(emergencyContacts?.additionalContacts || [])];
                                newContacts[index] = { ...contact, phone: e.target.value };
                                setEmergencyContacts(prev => ({ ...prev, additionalContacts: newContacts }));
                                setIsDirty(true);
                              }} className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-neutral-400" placeholder="(555) 999-9999" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

              </div>

              {/* ── Actions Footer ── */}
              <div className="p-5 border-t border-neutral-100 dark:border-neutral-700 shrink-0 bg-neutral-50/50 dark:bg-neutral-800/50 space-y-3">
                {/* Row 1: Navigation buttons */}
                <div className="flex gap-3">
                  {isFirst ? (
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={goPrev}
                      className="flex-1 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </button>
                  )}
                  {isLast ? (
                    <button
                      type="button"
                      onClick={() => handleSubmit('finish')}
                      className="flex-1 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Save className="w-4 h-4" /> Finish
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={goNext}
                      className="flex-1 py-2.5 rounded-xl bg-neutral-900 dark:bg-neutral-100 hover:bg-neutral-800 dark:hover:bg-white text-white dark:text-neutral-900 font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Row 2: Full-width Save Changes (edit mode: any tab; add mode: last tab only) */}
                <AnimatePresence>
                  {isDirty && (isEditMode || isLast) && (
                    <motion.button
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      type="button"
                      onClick={() => handleSubmit('save')}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors flex items-center justify-center gap-2 overflow-hidden"
                    >
                      <Save className="w-4 h-4" />
                      {isEditMode ? 'Save Changes' : 'Add Pet'}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={showCropper}
        onClose={() => setShowCropper(false)}
        imageSrc={selectedImage}
        onCropComplete={handleCropComplete}
        shape={avatarShape}
      />
    </AnimatePresence>
  );
}
