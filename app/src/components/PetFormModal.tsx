import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Pet, EmergencyContacts } from '../types/pet';
import { usePets } from '../contexts/PetContext';
import { ImageCropperModal, getCroppedImg } from './ImageCropperModal';
import { useAuth } from '../contexts/AuthContext';
import { uploadPetProfilePhoto } from '../lib/storageService';
import { DateWheelPicker } from './DateWheelPicker';

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
const TAB_ICONS: Record<Tab, string> = {
  basic: 'info',
  details: 'favorite',
  health: 'stethoscope',
  emergency: 'call',
};

interface PetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Pet, 'id'>) => void;
  pet?: Pet;
}

function getNotesCounterColor(count: number): string {
  if (count >= NOTES_MAX) return 'text-error font-semibold';
  if (count >= NOTES_MAX * 0.9) return 'text-primary';
  return 'text-on-surface-variant';
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
      className="flex flex-wrap gap-1.5 w-full px-3 py-2 min-h-[42px] rounded-xl border border-outline-variant bg-surface-container text-on-surface focus-within:ring-2 focus-within:ring-primary transition-colors cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded-full text-sm font-medium shrink-0">
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(i); }}
            className="text-on-secondary-container hover:text-error leading-none"
            aria-label={`Remove ${tag}`}
          >&times;</button>
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
        className="flex-1 min-w-[100px] bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant/50 text-sm"
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
        className="flex-1 min-w-0 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
      />
      <select
        value={unit}
        onChange={(e) => onUnitChange(e.target.value as U)}
        className="px-3 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
      >
        {units.map(u => <option key={u} value={u}>{u}</option>)}
      </select>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
function MetricCard({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-high rounded-xl p-4 border border-outline-variant">
      <div className="flex items-center gap-2 mb-2">
        <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
        <span className="text-sm font-medium text-on-surface">{label}</span>
      </div>
      {children}
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

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary transition-colors';

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
  const [dietSchedules, setDietSchedules] = useState<import('../types/pet').DietSchedule[]>([]);
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

    // Diet — migrate legacy single-food fields to DietSchedule[]
    setFoodBrand(pet?.foodBrand ?? pet?.food ?? '');
    setFoodAmount(pet?.foodAmount ?? '');
    setFoodUnit((pet?.foodUnit ?? 'cups') as typeof foodUnit);
    if (pet?.dietSchedule && pet.dietSchedule.length > 0) {
      setDietSchedules(pet.dietSchedule);
    } else if (pet?.foodBrand || pet?.food) {
      // Legacy migration: convert old single-food fields to a DietSchedule
      setDietSchedules([{
        foodType: pet?.foodBrand || pet?.food || '',
        entries: pet?.foodAmount ? [{ amount: pet.foodAmount, unit: pet.foodUnit || 'cups', time: '08:00' }] : [],
      }]);
    } else {
      setDietSchedules([]);
    }
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
      dietSchedule: dietSchedules.length > 0 ? dietSchedules : [],
      medicalVisits: pet?.medicalVisits ?? [],
      statusTags: statusTags.length > 0 ? statusTags : undefined,
      publicFields: publicFields.filter(k => !['microchipId', 'notes', 'emergencyContacts', 'medicalVisits'].includes(k)),
    });
    setIsDirty(false);

    const shouldClose = action === 'finish';
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
          className="fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6"
          onMouseDown={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
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
            className="relative glass-card w-full max-w-4xl z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-outline-variant shrink-0">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[22px] text-primary">pets</span>
                <div>
                  <h2 id="pet-form-modal-title" className="text-xl font-bold text-on-surface" style={{ fontFamily: 'var(--font-headline)' }}>
                    {isEditMode ? 'Edit Pet Profile' : 'Add a Pet'}
                  </h2>
                  {isEditMode && pet && (
                    <p className="text-sm text-secondary">{pet.name}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-on-surface-variant hover:text-on-surface transition-colors p-1.5 rounded-xl hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Tabs — Desktop (numbered steps) */}
            <div className="hidden sm:flex border-b border-outline-variant px-6 shrink-0">
              {TAB_ORDER.map((tab, i) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-2 py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab
                    ? 'border-primary-container text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center bg-surface-container-highest text-on-surface-variant">
                    {i + 1}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">{TAB_ICONS[tab]}</span>
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Tabs — Mobile: Left/Right arrow navigation */}
            <div className="flex sm:hidden items-center border-b border-outline-variant px-4 py-3 shrink-0 gap-3">
              <button
                type="button"
                onClick={goPrev}
                disabled={isFirst}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <div className="flex-1 text-center">
                <span className="text-sm font-semibold text-on-surface">{TAB_LABELS[activeTab]}</span>
                <span className="text-xs text-on-surface-variant ml-2">({tabIdx + 1}/{TAB_ORDER.length})</span>
              </div>
              <button
                type="button"
                onClick={goNext}
                disabled={isLast}
                className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">

                {/* ── Basic Info ── */}
                {activeTab === 'basic' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-5"
                  >
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                        Name <span className="text-error">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => { setName(e.target.value); mark(); }}
                        placeholder="e.g. Max"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                        Pet Type
                      </label>
                      <select
                        value={petType}
                        onChange={(e) => { setPetType(e.target.value); if (e.target.value !== 'Other') setCustomPetType(''); mark(); }}
                        className={inputClass}
                      >
                        <option value="">Select type...</option>
                        {PET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {petType === 'Other' && (
                        <input
                          type="text"
                          value={customPetType}
                          onChange={(e) => { setCustomPetType(e.target.value); mark(); }}
                          placeholder="e.g. Bearded Dragon, Axolotl, Tarantula..."
                          className={`mt-2 ${inputClass}`}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                        Breed
                      </label>
                      <input
                        type="text"
                        value={breed}
                        onChange={(e) => { setBreed(e.target.value); mark(); }}
                        placeholder="e.g. Golden Retriever"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                        Birthday
                      </label>
                      <DateWheelPicker
                        value={birthday}
                        onChange={(d) => { setBirthday(d); mark(); }}
                        maxDate={new Date().toISOString().split('T')[0]}
                      />
                      {birthday && (
                        <p className="text-xs text-on-surface-variant mt-1">Age: {calcAgeFromBirthday(birthday)}</p>
                      )}
                    </div>
                    {/* Profile Photo & Appearance */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                        Profile Photo & Appearance
                      </label>
                      <div className="flex flex-col sm:flex-row gap-6 bg-surface-container p-4 rounded-xl border border-outline-variant">
                        {/* Preview: circular avatar with story-ring gradient border */}
                        <div className="flex flex-col items-center justify-center shrink-0">
                          <div className="story-ring p-[3px] rounded-full">
                            <div
                              className="relative group w-28 h-28 rounded-full overflow-hidden"
                              style={{ backgroundColor }}
                            >
                              <div className={`w-full h-full overflow-hidden ${avatarShape === 'circle' ? 'rounded-full' : avatarShape === 'square' ? 'rounded-xl' : avatarShape === 'squircle' ? 'rounded-[2rem]' : 'rounded-full'}`}>
                                {image ? (
                                  <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                                    <span className="material-symbols-outlined text-[32px]">image</span>
                                  </div>
                                )}
                              </div>
                              {/* Camera edit overlay */}
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 bg-black/40 text-on-primary flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                              >
                                <span className="material-symbols-outlined text-[24px]">photo_camera</span>
                                <span className="text-xs font-medium mt-0.5">Upload</span>
                              </button>
                            </div>
                          </div>
                          <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                        </div>

                        <div className="flex-1 space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Background Color</label>
                            <div className="flex flex-wrap gap-2">
                              {['#f87171', '#fb923c', '#fbbf24', '#facc15', '#a3e635',
                                '#4ade80', '#34d399', '#2dd4bf', '#22d3ee', '#38bdf8',
                                '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#e879f9',
                                '#f472b6', '#fb7185', '#94a3b8', '#a8a29e', '#1c1917'].map(color => (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() => { setBackgroundColor(color); mark(); }}
                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${backgroundColor === color ? 'border-on-surface shadow-sm ring-2 ring-primary scale-110' : 'border-transparent shadow-sm'}`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-outline-variant">
                            <label className="flex items-center justify-between cursor-pointer">
                              <div>
                                <span className="text-sm font-bold text-on-surface">Private Profile</span>
                                <p className="text-xs text-on-surface-variant mt-0.5">Hide this pet from the public community.</p>
                              </div>
                              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isPrivate ? 'bg-primary' : 'bg-surface-container-highest'}`}>
                                <input type="checkbox" className="sr-only" checked={isPrivate} onChange={(e) => { setIsPrivate(e.target.checked); mark(); }} />
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-on-primary transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-1'}`} />
                              </div>
                            </label>
                          </div>

                          {/* Public Profile Fields — only visible when not private */}
                          {!isPrivate && (
                            <div className="pt-2 border-t border-outline-variant">
                              <p className="text-sm font-bold text-on-surface mb-1">Public Profile Fields</p>
                              <p className="text-xs text-on-surface-variant mb-3">Choose which fields other users can see on your pet's public profile.</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {/* Always-public fields (disabled, checked) */}
                                {['name', 'type', 'breed', 'age', 'image'].map(f => (
                                  <label key={f} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary-container text-on-secondary-container text-xs opacity-70 cursor-default">
                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                    <span className="capitalize">{f === 'image' ? 'Photo' : f}</span>
                                  </label>
                                ))}
                                {/* Optional public fields */}
                                {[
                                  { key: 'weight', label: 'Weight' },
                                  { key: 'food', label: 'Diet / Food' },
                                  { key: 'likes', label: 'Likes' },
                                  { key: 'dislikes', label: 'Dislikes' },
                                  { key: 'favoriteActivities', label: 'Activities' },
                                  { key: 'activity', label: 'Activity Level' },
                                  { key: 'spayedNeutered', label: 'Spayed/Neutered' },
                                ].map(({ key, label }) => (
                                  <label key={key} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface-variant text-xs cursor-pointer hover:bg-surface-container-high transition-colors">
                                    <input
                                      type="checkbox"
                                      className="w-3.5 h-3.5 rounded border-outline-variant text-primary focus:ring-primary"
                                      checked={publicFields.includes(key)}
                                      onChange={(e) => {
                                        setPublicFields(prev => e.target.checked ? [...prev, key] : prev.filter(k => k !== key));
                                        mark();
                                      }}
                                    />
                                    {label}
                                  </label>
                                ))}
                                {/* Never-public fields (disabled, locked) */}
                                {[
                                  { key: 'microchipId', label: 'Microchip ID' },
                                  { key: 'notes', label: 'Notes' },
                                  { key: 'emergencyContacts', label: 'Emergency Contacts' },
                                  { key: 'medicalVisits', label: 'Medical Records' },
                                ].map(({ key, label }) => (
                                  <label key={key} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container-highest text-on-surface-variant text-xs cursor-default opacity-60">
                                    <span className="material-symbols-outlined text-[14px]">lock</span>
                                    {label}
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] shrink-0" aria-hidden="true">collections</span>
                      Manage photos in the <button type="button" onClick={onClose} className="underline hover:text-primary">Photo Library</button> on My Pets.
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
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                        Likes <span className="text-xs text-on-surface-variant font-normal">(type then press Enter or comma)</span>
                      </label>
                      <TagInput
                        tags={likeTags}
                        input={likeInput}
                        onInputChange={(v) => { setLikeInput(v); mark(); }}
                        onAdd={(t) => { setLikeTags(prev => [...prev, t]); mark(); }}
                        onRemove={(i) => { setLikeTags(prev => prev.filter((_, idx) => idx !== i)); mark(); }}
                        placeholder="e.g. Belly rubs, Tennis balls..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                        Dislikes <span className="text-xs text-on-surface-variant font-normal">(type then press Enter or comma)</span>
                      </label>
                      <TagInput
                        tags={dislikeTags}
                        input={dislikeInput}
                        onInputChange={(v) => { setDislikeInput(v); mark(); }}
                        onAdd={(t) => { setDislikeTags(prev => [...prev, t]); mark(); }}
                        onRemove={(i) => { setDislikeTags(prev => prev.filter((_, idx) => idx !== i)); mark(); }}
                        placeholder="e.g. Vacuum cleaner, Thunder..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                        Favorite Activities <span className="text-xs text-on-surface-variant font-normal">(type then press Enter or comma)</span>
                      </label>
                      <TagInput
                        tags={activityTags}
                        input={activityInput}
                        onInputChange={(v) => { setActivityInput(v); mark(); }}
                        onAdd={(t) => { setActivityTags(prev => [...prev, t]); mark(); }}
                        onRemove={(i) => { setActivityTags(prev => prev.filter((_, idx) => idx !== i)); mark(); }}
                        placeholder="e.g. Swimming, Hiking, Fetch..."
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                          Type of Play
                        </label>
                        <input
                          type="text"
                          value={typeOfPlay}
                          onChange={(e) => { setTypeOfPlay(e.target.value); mark(); }}
                          placeholder="e.g. Rough, Gentle, Independent"
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1.5">
                          Activity Level
                        </label>
                        <select
                          value={activity}
                          onChange={(e) => { setActivity(e.target.value); mark(); }}
                          className={inputClass}
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
                      <label className="block text-sm font-medium text-on-surface-variant mb-2">
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
                                ? 'bg-secondary-container border-secondary text-on-secondary-container'
                                : 'bg-surface-container border-outline-variant text-on-surface-variant hover:border-primary'
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-on-surface-variant">Click to toggle. Tags appear on your pet's profile.</p>
                    </div>
                  </motion.div>
                )}

                {/* ── Health & Diet ── */}
                {activeTab === 'health' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5"
                  >
                    {/* Metric cards in 2-col grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <MetricCard icon="height" label="Height">
                        <UnitInput
                          value={heightNum}
                          unit={heightUnit}
                          units={['inches', 'cm'] as const}
                          onValueChange={(v) => { setHeightNum(v); mark(); }}
                          onUnitChange={(u) => { setHeightUnit(u); mark(); }}
                          placeholder="0"
                        />
                      </MetricCard>
                      <MetricCard icon="straighten" label="Length">
                        <UnitInput
                          value={lengthNum}
                          unit={lengthUnit}
                          units={['inches', 'cm'] as const}
                          onValueChange={(v) => { setLengthNum(v); mark(); }}
                          onUnitChange={(u) => { setLengthUnit(u); mark(); }}
                          placeholder="0"
                        />
                      </MetricCard>
                      <MetricCard icon="monitor_weight" label="Weight">
                        <UnitInput
                          value={weightNum}
                          unit={weightUnit}
                          units={['lbs', 'kg'] as const}
                          onValueChange={(v) => { setWeightNum(v); mark(); }}
                          onUnitChange={(u) => { setWeightUnit(u); mark(); }}
                          placeholder="0"
                        />
                      </MetricCard>
                      <MetricCard icon="vital_signs" label="Body Condition">
                        <select
                          value={bodyConditionScore}
                          onChange={(e) => { setBodyConditionScore(e.target.value); mark(); }}
                          className={inputClass}
                        >
                          <option value="">Not set</option>
                          <option value="Underweight">Underweight</option>
                          <option value="Healthy weight">Healthy weight</option>
                          <option value="Overweight">Overweight</option>
                        </select>
                      </MetricCard>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Spayed / Neutered</label>
                        <select
                          value={spayedNeutered}
                          onChange={(e) => { setSpayedNeutered(e.target.value as typeof spayedNeutered); mark(); }}
                          className={inputClass}
                        >
                          <option value="">Not set</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Microchip ID</label>
                        <input
                          type="text"
                          value={microchipId}
                          onChange={(e) => { setMicrochipId(e.target.value); mark(); }}
                          placeholder="e.g. 985112345678901"
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Primary Diet — multi-schedule feeding */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-on-surface-variant">Feeding Schedule</label>
                      {dietSchedules.map((sched, si) => (
                        <div key={si} className="bg-surface-container rounded-xl border border-outline-variant p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={sched.foodType}
                              onChange={(e) => {
                                const updated = [...dietSchedules];
                                updated[si] = { ...updated[si], foodType: e.target.value };
                                setDietSchedules(updated); mark();
                              }}
                              placeholder="Food type (e.g. Purina Pro Plan)"
                              className={`${inputClass} text-sm flex-1`}
                            />
                            {dietSchedules.length > 1 && (
                              <button type="button" onClick={() => { setDietSchedules(dietSchedules.filter((_, i) => i !== si)); mark(); }}
                                className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container transition-colors">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            )}
                          </div>
                          {sched.entries.map((entry, ei) => (
                            <div key={ei} className="flex items-center gap-2">
                              <input
                                type="number" min="0" step="0.5"
                                value={entry.amount}
                                onChange={(e) => {
                                  const updated = [...dietSchedules];
                                  const entries = [...updated[si].entries];
                                  entries[ei] = { ...entries[ei], amount: e.target.value };
                                  updated[si] = { ...updated[si], entries };
                                  setDietSchedules(updated); mark();
                                }}
                                placeholder="Amt"
                                className={`${inputClass} text-sm w-16`}
                              />
                              <select
                                value={entry.unit}
                                onChange={(e) => {
                                  const updated = [...dietSchedules];
                                  const entries = [...updated[si].entries];
                                  entries[ei] = { ...entries[ei], unit: e.target.value };
                                  updated[si] = { ...updated[si], entries };
                                  setDietSchedules(updated); mark();
                                }}
                                className={`${inputClass} text-sm w-24`}
                              >
                                <option value="cup">cup</option>
                                <option value="cups">cups</option>
                                <option value="oz">oz</option>
                                <option value="grams">g</option>
                                <option value="lbs">lbs</option>
                                <option value="tbsp">tbsp</option>
                              </select>
                              <span className="text-xs text-on-surface-variant">at</span>
                              <input
                                type="time"
                                value={entry.time}
                                onChange={(e) => {
                                  const updated = [...dietSchedules];
                                  const entries = [...updated[si].entries];
                                  entries[ei] = { ...entries[ei], time: e.target.value };
                                  updated[si] = { ...updated[si], entries };
                                  setDietSchedules(updated); mark();
                                }}
                                className={`${inputClass} text-sm w-28`}
                              />
                              <button type="button" onClick={() => {
                                const updated = [...dietSchedules];
                                const entries = updated[si].entries.filter((_, i) => i !== ei);
                                updated[si] = { ...updated[si], entries };
                                setDietSchedules(updated); mark();
                              }}
                                className="p-1 rounded text-on-surface-variant hover:text-error transition-colors">
                                <span className="material-symbols-outlined text-[16px]">close</span>
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...dietSchedules];
                              const entries = [...updated[si].entries, { amount: '', unit: 'cup', time: '08:00' }];
                              updated[si] = { ...updated[si], entries };
                              setDietSchedules(updated); mark();
                            }}
                            className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">add</span> Add feeding time
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setDietSchedules([...dietSchedules, { foodType: '', entries: [{ amount: '', unit: 'cup', time: '08:00' }] }]); mark(); }}
                        className="w-full py-2 rounded-xl border-2 border-dashed border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary text-sm font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span> Add food
                      </button>
                    </div>

                    {/* Notes */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-sm font-medium text-on-surface-variant">
                          Diet or Medical Notes{' '}
                          <span className="text-xs font-normal bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full ml-1">
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
                        className={`${inputClass} resize-none`}
                      />
                      {notes.length >= NOTES_MAX && (
                        <p className="text-xs text-error mt-1">Character limit reached.</p>
                      )}
                      <p className="text-xs text-on-surface-variant mt-1">
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
                      <p className="text-sm text-on-surface-variant">Vet info and emergency contacts for this pet.</p>
                      {allPets.length > 0 && allPets.some(p => p.id !== pet?.id && (p.emergencyContacts?.vetInfo?.clinic || p.emergencyContacts?.ownerPhone || p.emergencyContacts?.additionalContacts?.some(c => c.name))) && (
                        <div className="relative group/autofill">
                          <select
                            className="appearance-none pl-8 pr-4 py-1.5 rounded-full border border-outline-variant bg-surface-container text-xs font-medium text-on-surface-variant cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
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
                          <span className="material-symbols-outlined text-[14px] absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant group-hover/autofill:text-primary pointer-events-none transition-colors">content_copy</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-on-surface">
                        <span className="material-symbols-outlined text-[18px] text-primary">cardiology</span> Vet Info
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Clinic Name</label>
                          <input type="text" value={emergencyContacts?.vetInfo?.clinic || ''} onChange={e => { setEmergencyContacts(prev => ({ ...prev, vetInfo: { ...prev?.vetInfo, clinic: e.target.value, name: prev?.vetInfo?.name || '', phone: prev?.vetInfo?.phone || '', address: prev?.vetInfo?.address || '' } })); setIsDirty(true); }} className={`${inputClass} text-sm`} placeholder="Happy Paws Clinic" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Doctor Name</label>
                          <input type="text" value={emergencyContacts?.vetInfo?.name || ''} onChange={e => { setEmergencyContacts(prev => ({ ...prev, vetInfo: { ...prev?.vetInfo, name: e.target.value, clinic: prev?.vetInfo?.clinic || '', phone: prev?.vetInfo?.phone || '', address: prev?.vetInfo?.address || '' } })); setIsDirty(true); }} className={`${inputClass} text-sm`} placeholder="Dr. Smith" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Vet Phone</label>
                          <input type="tel" value={emergencyContacts?.vetInfo?.phone || ''} onChange={e => { setEmergencyContacts(prev => ({ ...prev, vetInfo: { ...prev?.vetInfo, phone: e.target.value, clinic: prev?.vetInfo?.clinic || '', name: prev?.vetInfo?.name || '', address: prev?.vetInfo?.address || '' } })); setIsDirty(true); }} className={`${inputClass} text-sm`} placeholder="(555) 000-0000" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Vet Address</label>
                          <input type="text" value={emergencyContacts?.vetInfo?.address || ''} onChange={e => { setEmergencyContacts(prev => ({ ...prev, vetInfo: { ...prev?.vetInfo, address: e.target.value, clinic: prev?.vetInfo?.clinic || '', name: prev?.vetInfo?.name || '', phone: prev?.vetInfo?.phone || '' } })); setIsDirty(true); }} className={`${inputClass} text-sm`} placeholder="123 Vet Clinic Way" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-on-surface-variant mb-1.5">Owner / Primary Phone</label>
                      <input
                        type="tel"
                        value={emergencyContacts?.ownerPhone || ''}
                        onChange={e => { setEmergencyContacts(prev => ({ ...prev, ownerPhone: e.target.value })); setIsDirty(true); }}
                        className={`${inputClass} text-sm`}
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div className="p-4 bg-surface-container rounded-xl border border-outline-variant space-y-4">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5 text-on-surface">
                        <span className="material-symbols-outlined text-[18px] text-tertiary">call</span> Additional Contacts
                      </h4>
                      {[0, 1, 2].map(index => {
                        const contact = emergencyContacts?.additionalContacts?.[index] || { name: '', phone: '' };
                        const isHidden = index > 0 && !(emergencyContacts?.additionalContacts?.[index - 1]?.name || emergencyContacts?.additionalContacts?.[index - 1]?.phone);
                        if (isHidden && !contact.name && !contact.phone) return null;

                        return (
                          <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 first:pt-0">
                            <div>
                              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Contact {index + 1} Name</label>
                              <input type="text" value={contact.name} onChange={e => {
                                const newContacts = [...(emergencyContacts?.additionalContacts || [])];
                                newContacts[index] = { ...contact, name: e.target.value };
                                setEmergencyContacts(prev => ({ ...prev, additionalContacts: newContacts }));
                                setIsDirty(true);
                              }} className={`${inputClass} text-sm`} placeholder="Jane Doe" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">Contact {index + 1} Phone</label>
                              <input type="tel" value={contact.phone} onChange={e => {
                                const newContacts = [...(emergencyContacts?.additionalContacts || [])];
                                newContacts[index] = { ...contact, phone: e.target.value };
                                setEmergencyContacts(prev => ({ ...prev, additionalContacts: newContacts }));
                                setIsDirty(true);
                              }} className={`${inputClass} text-sm`} placeholder="(555) 999-9999" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

              </div>

              {/* ── Actions Footer ── */}
              <div className="p-5 border-t border-outline-variant shrink-0 bg-surface-container-low/50 space-y-3">
                {/* Row 1: Navigation buttons */}
                <div className="flex gap-3">
                  {isFirst ? (
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container transition-colors"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={goPrev}
                      className="flex-1 py-2.5 rounded-xl border border-outline-variant text-on-surface-variant font-medium hover:bg-surface-container transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span> Back
                    </button>
                  )}
                  {isLast ? (
                    <button
                      type="button"
                      onClick={() => handleSubmit('finish')}
                      className="flex-1 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 bg-primary-container text-on-primary-container hover:brightness-110"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span> Finish Profile
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { handleSubmit('save'); goNext(); }}
                      className="flex-1 py-2.5 rounded-xl bg-primary-container text-on-primary-container font-medium transition-colors flex items-center justify-center gap-2 hover:brightness-110"
                    >
                      Save & Continue <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  )}
                </div>

                {/* Row 2: Full-width Save Changes (edit mode: any tab; add mode: last tab only) */}
                <AnimatePresence>
                  {isDirty && isEditMode && (
                    <motion.button
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      type="button"
                      onClick={() => handleSubmit('save')}
                      className="w-full py-2.5 rounded-xl bg-primary text-on-primary font-semibold transition-colors flex items-center justify-center gap-2 overflow-hidden hover:brightness-110"
                    >
                      <span className="material-symbols-outlined text-[18px]">save</span>
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
        shape="circle"
      />
    </AnimatePresence>
  );
}
