// app/src/components/cards/CardSectionRenderer.tsx
// Core shared renderer for the 9-section pet card layout.
// Eliminates triplication across CardPreview, MultiPetCardPreview, and SharedCardPage.

import React from 'react';
import { Info, Heart, Utensils, Syringe, Shield, ShieldOff, Phone, HeartPulse } from 'lucide-react';
import { getVaccineStatus } from '../MedicalRecordsModal';
import type { PublicCardPetSnapshot } from '../../lib/firestoreService';
import type { SharingToggles } from '../../types/cardExtensions';
import { CardDetailSection } from './CardDetailSection';
import { formatPetAge } from '../../lib/petAge';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_ORDER = [
  'basicInfo',
  'personalityPlay',
  'diet',
  'medicalOverview',
  'vaccineRecords',
  'medications',
  'microchip',
  'emergencyContact',
  'vetInfo',
];

interface SectionConfig {
  title: string;
  icon: React.ReactNode;
  defaultOpen: boolean;
}

const SECTION_CONFIGS: Record<string, SectionConfig> = {
  basicInfo: {
    title: 'Pet Description',
    icon: <Info className="w-4 h-4 text-stone-400" />,
    defaultOpen: true,
  },
  personalityPlay: {
    title: 'Personality & Play',
    icon: <Heart className="w-4 h-4 text-violet-400" />,
    defaultOpen: true,
  },
  diet: {
    title: 'Health & Diet',
    icon: <Utensils className="w-4 h-4 text-stone-400" />,
    defaultOpen: false,
  },
  medicalOverview: {
    title: 'Medical Notes',
    icon: <Syringe className="w-4 h-4 text-blue-400" />,
    defaultOpen: false,
  },
  vaccineRecords: {
    title: 'Vaccine Records',
    icon: <Syringe className="w-4 h-4 text-stone-400" />,
    defaultOpen: false,
  },
  microchip: {
    title: 'Microchip ID',
    icon: <Shield className="w-4 h-4 text-stone-400" />,
    defaultOpen: false,
  },
  emergencyContact: {
    title: 'Emergency Contacts',
    icon: <Phone className="w-4 h-4 text-blue-400" />,
    defaultOpen: false,
  },
  vetInfo: {
    title: 'Vet Info',
    icon: <HeartPulse className="w-4 h-4 text-emerald-400" />,
    defaultOpen: false,
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CardSectionRendererProps {
  data: PublicCardPetSnapshot;
  sharing: SharingToggles;
  fieldOrder?: string[];
  includeGeneralInfo?: boolean;
  compact?: boolean; // true = flat sections (no accordions), tighter density
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-stone-50 dark:bg-stone-700/60 rounded-xl p-2 border border-stone-100 dark:border-stone-600">
      <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{label}</p>
      <p className="font-semibold text-stone-800 dark:text-stone-100 text-xs">{value}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CardSectionRenderer({
  data,
  sharing,
  fieldOrder,
  includeGeneralInfo = false,
  compact = false,
}: CardSectionRendererProps) {
  const order = fieldOrder ?? DEFAULT_ORDER;

  // ── Section: basicInfo ──
  const basicInfoContent: React.ReactNode = sharing.basicInfo ? (
    <div className="grid grid-cols-2 gap-2 text-sm mb-2">
      {data.breed && <InfoChip label="Breed" value={data.breed} />}
      {data.type && <InfoChip label="Type" value={data.type} />}
      {(data.age || data.birthday) && (
        <InfoChip
          label="Age"
          value={formatPetAge(data.birthday, data.age ?? '')}
        />
      )}
      {data.weight && <InfoChip label="Weight" value={data.weight} />}
      {data.spayedNeutered && data.spayedNeutered !== 'Unknown' && (
        <div className="bg-stone-50 dark:bg-stone-700/60 rounded-xl p-2 border border-stone-100 dark:border-stone-600 col-span-2">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">Spayed/Neutered</p>
          <p className="font-semibold text-stone-800 dark:text-stone-100 text-xs">{data.spayedNeutered}</p>
        </div>
      )}
    </div>
  ) : null;

  // ── Section: personalityPlay ──
  const hasPersonality =
    (data.likes?.length ?? 0) > 0 ||
    (data.dislikes?.length ?? 0) > 0 ||
    (data.favoriteActivities?.length ?? 0) > 0 ||
    data.typeOfPlay ||
    data.activity;

  const personalityPlayContent: React.ReactNode =
    sharing.personalityPlay && hasPersonality ? (
      <div
        className={
          compact
            ? 'bg-violet-50 dark:bg-violet-900/20 rounded-xl p-2.5 border border-violet-100 dark:border-violet-800'
            : 'bg-violet-50 dark:bg-violet-900/20 rounded-2xl p-3 border border-violet-100 dark:border-violet-800'
        }
      >
        <div className="space-y-1.5 text-xs">
          {(data.likes?.length ?? 0) > 0 && (
            <p className="text-emerald-700 dark:text-emerald-400">
              <span className="font-semibold">Likes:</span> {data.likes!.join(', ')}
            </p>
          )}
          {(data.dislikes?.length ?? 0) > 0 && (
            <p className="text-rose-700 dark:text-rose-400">
              <span className="font-semibold">Dislikes:</span> {data.dislikes!.join(', ')}
            </p>
          )}
          {(data.favoriteActivities?.length ?? 0) > 0 && (
            <p className="text-amber-700 dark:text-amber-400">
              <span className="font-semibold">Favorite Activities:</span>{' '}
              {data.favoriteActivities!.join(', ')}
            </p>
          )}
          {data.typeOfPlay && (
            <p className="text-sky-700 dark:text-sky-400">
              <span className="font-semibold">Type of Play:</span> {data.typeOfPlay}
            </p>
          )}
          {data.activity && (
            <p className="text-violet-700 dark:text-violet-400">
              <span className="font-semibold">Activity Level:</span> {data.activity}
            </p>
          )}
        </div>
      </div>
    ) : null;

  // ── Section: diet ──
  const dietContent: React.ReactNode =
    sharing.diet && (data.food || data.notes) ? (
      <div>
        {data.food && <p className="text-stone-600 mb-1 text-sm">{data.food}</p>}
        {data.notes && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 border border-blue-100 dark:border-blue-800 mt-1">
            {data.notes.startsWith('eyJ') ? (
              <p className="text-xs text-blue-400 italic flex items-center gap-1">
                <span>🔒</span> Encrypted
              </p>
            ) : (
              <p className="text-xs text-blue-700 dark:text-blue-300">{data.notes}</p>
            )}
          </div>
        )}
      </div>
    ) : null;

  // ── Section: medicalOverview ──
  const medicalOverviewContent: React.ReactNode =
    sharing.medicalOverview && (data.medications?.length ?? 0) > 0 ? (
      <div
        className={
          compact
            ? 'bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 border border-blue-100 dark:border-blue-800'
            : 'bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-3 border border-blue-100 dark:border-blue-800'
        }
      >
        <div className="space-y-2 mt-1.5">
          {data.medications!.map((m: any, i: number) => {
            if (!m.name) return null;
            const freq =
              m.customFrequency ||
              (m.frequency === '8 hours' ? 'As Needed' : m.frequency);
            return (
              <div
                key={i}
                className="text-xs border-b border-blue-100 dark:border-blue-800 last:border-0 pb-1.5 last:pb-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900 dark:text-blue-100">{m.name}</span>
                  {freq && <span className="text-blue-600 dark:text-blue-300 font-medium">{freq}</span>}
                </div>
                {m.dosage && <p className="text-blue-700 dark:text-blue-300 mt-0.5">Dosage: {m.dosage}</p>}
                {(m.startDate || m.endDate) && (
                  <p className="text-blue-500 dark:text-blue-400 text-[9px] mt-0.5 uppercase tracking-tight">
                    {m.startDate && `Start: ${m.startDate}`}
                    {m.startDate && m.endDate && ' • '}
                    {m.endDate && `End: ${m.endDate}`}
                  </p>
                )}
                {m.notes && (
                  <p className="text-blue-600 dark:text-blue-400 mt-1 italic leading-snug text-[10px]">
                    {m.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ) : null;

  // ── Section: vaccineRecords ──
  const vaccines = (data.vaccines ?? []) as Array<{
    name: string;
    lastDate?: string;
    nextDueDate?: string;
  }>;
  const filledVaccines = vaccines.filter(v => v.name && (v.lastDate || v.nextDueDate));

  const vaccineRecordsContent: React.ReactNode =
    sharing.vaccineRecords && filledVaccines.length > 0 ? (
      <div className="space-y-1.5">
        {filledVaccines.map((v, i) => {
          const st = getVaccineStatus(v.nextDueDate ?? '');
          return (
            <div
              key={i}
              className={`flex items-center justify-between text-xs border border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 ${
                compact ? 'rounded-lg px-2.5 py-1.5' : 'rounded-xl px-3 py-2'
              }`}
            >
              <span className="font-medium text-stone-800 dark:text-stone-200">{v.name}</span>
              <span
                className={`font-semibold ${
                  st === 'overdue'
                    ? 'text-rose-600'
                    : st === 'due-soon'
                    ? 'text-amber-600'
                    : st === 'up-to-date'
                    ? 'text-emerald-600'
                    : 'text-stone-400'
                }`}
              >
                {st === 'overdue'
                  ? '❌ Overdue'
                  : st === 'due-soon'
                  ? '⚠️ Due'
                  : st === 'up-to-date'
                  ? '✅'
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>
    ) : null;

  // ── Section: microchip ──
  const microchipContent: React.ReactNode = sharing.microchip ? (
    <div>
      {data.microchipId ? (
        data.microchipId.startsWith('eyJ') ? (
          <p className="text-xs bg-stone-50 rounded-xl px-3 py-2 border border-stone-100 font-mono text-stone-400 italic flex items-center gap-1">
            <span>🔒</span> Encrypted
          </p>
        ) : (
          <p className="text-xs bg-stone-50 rounded-xl px-3 py-2 border border-stone-100 font-mono text-stone-700 break-all">
            {data.microchipId}
          </p>
        )
      ) : (
        <div className="flex items-center gap-2 text-sm bg-stone-50 rounded-xl p-3 border border-stone-100">
          <ShieldOff className="w-4 h-4 text-stone-400 shrink-0" />
          <span className="text-stone-500">Not Microchipped</span>
        </div>
      )}
    </div>
  ) : null;

  // ── Section: emergencyContact ──
  const hasEmergencyData =
    data.emergencyContacts?.ownerPhone ||
    data.emergencyContacts?.additionalContacts?.some(c => c.name || c.phone);

  const emergencyContactContent: React.ReactNode = sharing.emergencyContact ? (
    <div
      className={
        compact
          ? 'bg-stone-50 rounded-xl p-3 border border-stone-100'
          : 'bg-stone-50 rounded-2xl p-4 border border-stone-100 space-y-3 text-left'
      }
    >
      <h3 className="text-stone-900 font-bold flex items-center gap-1.5 mb-1 text-sm">
        <Phone className="w-4 h-4 text-blue-500" /> Emergency Contacts
      </h3>
      {data.emergencyContacts?.ownerPhone && (
        <div className="mb-2">
          <p className="text-xs text-stone-500">Owner</p>
          <p className="font-medium text-stone-800 text-sm">
            {data.emergencyContacts.ownerPhone}
          </p>
        </div>
      )}
      {data.emergencyContacts?.additionalContacts
        ?.filter(c => c.name || c.phone)
        .map((c, i) => (
          <div key={i} className="mb-2 last:mb-0">
            <p className="text-xs text-stone-500">{c.name}</p>
            <p className="font-medium text-stone-800 text-sm">{c.phone}</p>
          </div>
        ))}
      {!hasEmergencyData && (
        <p className="text-xs text-stone-500 italic">
          Secondary contact info is not on file.
        </p>
      )}
    </div>
  ) : null;

  // ── Section: vetInfo ──
  const vetInfoContent: React.ReactNode =
    sharing.vetInfo && data.emergencyContacts?.vetInfo ? (
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
        <h3 className="text-stone-900 font-bold flex items-center gap-1.5 mb-1 text-sm">
          <HeartPulse className="w-4 h-4 text-emerald-500" /> Vet Info
        </h3>
        <p className="font-medium text-stone-800 text-sm">
          {data.emergencyContacts!.vetInfo!.name}
        </p>
        <p className="text-xs text-stone-500">{data.emergencyContacts!.vetInfo!.phone}</p>
        {data.emergencyContacts!.vetInfo!.address && (
          <p className="text-xs text-stone-500">{data.emergencyContacts!.vetInfo!.address}</p>
        )}
      </div>
    ) : null;

  // ── Section content map ──
  const sectionContent: Record<string, React.ReactNode> = {
    basicInfo: basicInfoContent,
    personalityPlay: personalityPlayContent,
    diet: dietContent,
    medicalOverview: medicalOverviewContent,
    vaccineRecords: vaccineRecordsContent,
    medications: null, // unified into medicalOverview
    microchip: microchipContent,
    emergencyContact: emergencyContactContent,
    vetInfo: vetInfoContent,
  };

  // ── Wrap each section ──
  function wrapSection(key: string, content: React.ReactNode): React.ReactNode {
    if (!content) return null;
    if (compact) {
      return (
        <div key={key} className="py-1">
          {content}
        </div>
      );
    }
    const config = SECTION_CONFIGS[key];
    if (!config) {
      return <div key={key}>{content}</div>;
    }
    return (
      <CardDetailSection
        key={key}
        id={`card-section-${key}`}
        title={config.title}
        icon={config.icon}
        defaultOpen={config.defaultOpen}
      >
        {content}
      </CardDetailSection>
    );
  }

  const orderedSections = order
    .map(k => wrapSection(k, sectionContent[k]))
    .filter(Boolean);

  return (
    <div className={compact ? 'space-y-2' : 'divide-y divide-stone-100 dark:divide-stone-700'}>
      {orderedSections}
      {includeGeneralInfo && data.householdInfo && (
        <div className={compact ? 'py-1' : 'px-6 py-4'}>
          <h3 className="font-bold text-stone-900 mb-1.5 uppercase tracking-wider text-xs flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Household Information
          </h3>
          <p className="text-xs text-stone-600 bg-stone-50 rounded-xl px-3 py-2 border border-stone-100 whitespace-pre-wrap break-words">
            {data.householdInfo}
          </p>
        </div>
      )}
    </div>
  );
}
