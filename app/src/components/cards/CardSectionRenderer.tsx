// app/src/components/cards/CardSectionRenderer.tsx
// Core shared renderer for the 9-section pet card layout.
// Eliminates triplication across CardPreview, MultiPetCardPreview, and SharedCardPage.

import React from 'react';
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
    icon: <span className="material-symbols-outlined text-[16px] text-on-surface-variant">info</span>,
    defaultOpen: true,
  },
  personalityPlay: {
    title: 'Personality & Play',
    icon: <span className="material-symbols-outlined text-[16px] text-tertiary">favorite</span>,
    defaultOpen: true,
  },
  diet: {
    title: 'Health & Diet',
    icon: <span className="material-symbols-outlined text-[16px] text-on-surface-variant">restaurant</span>,
    defaultOpen: false,
  },
  medicalOverview: {
    title: 'Medical Notes',
    icon: <span className="material-symbols-outlined text-[16px] text-secondary">syringe</span>,
    defaultOpen: false,
  },
  vaccineRecords: {
    title: 'Vaccine Records',
    icon: <span className="material-symbols-outlined text-[16px] text-on-surface-variant">syringe</span>,
    defaultOpen: false,
  },
  microchip: {
    title: 'Microchip ID',
    icon: <span className="material-symbols-outlined text-[16px] text-on-surface-variant">shield</span>,
    defaultOpen: false,
  },
  emergencyContact: {
    title: 'Emergency Contacts',
    icon: <span className="material-symbols-outlined text-[16px] text-secondary">phone</span>,
    defaultOpen: false,
  },
  vetInfo: {
    title: 'Vet Info',
    icon: <span className="material-symbols-outlined text-[16px] text-primary">monitor_heart</span>,
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
    <div className="bg-surface-container-low rounded-xl p-2 border border-outline-variant">
      <p className="text-xs text-on-surface-variant mb-0.5">{label}</p>
      <p className="font-semibold text-on-surface text-xs">{value}</p>
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
        <div className="bg-surface-container-low rounded-xl p-2 border border-outline-variant col-span-2">
          <p className="text-xs text-on-surface-variant mb-0.5">Spayed/Neutered</p>
          <p className="font-semibold text-on-surface text-xs">{data.spayedNeutered}</p>
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
            ? 'bg-tertiary-container rounded-xl p-2.5 border border-tertiary/30'
            : 'bg-tertiary-container rounded-2xl p-3 border border-tertiary/30'
        }
      >
        <div className="space-y-1.5 text-xs">
          {(data.likes?.length ?? 0) > 0 && (
            <p className="text-primary">
              <span className="font-semibold">Likes:</span> {data.likes!.join(', ')}
            </p>
          )}
          {(data.dislikes?.length ?? 0) > 0 && (
            <p className="text-error">
              <span className="font-semibold">Dislikes:</span> {data.dislikes!.join(', ')}
            </p>
          )}
          {(data.favoriteActivities?.length ?? 0) > 0 && (
            <p className="text-tertiary">
              <span className="font-semibold">Favorite Activities:</span>{' '}
              {data.favoriteActivities!.join(', ')}
            </p>
          )}
          {data.typeOfPlay && (
            <p className="text-secondary">
              <span className="font-semibold">Type of Play:</span> {data.typeOfPlay}
            </p>
          )}
          {data.activity && (
            <p className="text-tertiary">
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
        {data.food && <p className="text-on-surface-variant mb-1 text-sm">{data.food}</p>}
        {data.notes && (
          <div className={`bg-secondary-container ${compact ? 'rounded-xl' : 'rounded-2xl'} p-2.5 border border-secondary/30 mt-1`}>
            {data.notes.startsWith('eyJ') ? (
              <p className="text-xs text-secondary italic flex items-center gap-1" title="This information is encrypted and only visible to the pet owner">
                <span>🔒</span> Encrypted
              </p>
            ) : (
              <p className="text-xs text-on-secondary-container">{data.notes}</p>
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
            ? 'bg-secondary-container rounded-xl p-2.5 border border-secondary/30'
            : 'bg-secondary-container rounded-2xl p-3 border border-secondary/30'
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
                className="text-xs border-b border-secondary/30 last:border-0 pb-1.5 last:pb-0"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-on-secondary-container">{m.name}</span>
                  {freq && <span className="text-secondary font-medium">{freq}</span>}
                </div>
                {m.dosage && <p className="text-on-secondary-container mt-0.5">Dosage: {m.dosage}</p>}
                {(m.startDate || m.endDate) && (
                  <p className="text-secondary text-[9px] mt-0.5 uppercase tracking-tight">
                    {m.startDate && `Start: ${m.startDate}`}
                    {m.startDate && m.endDate && ' • '}
                    {m.endDate && `End: ${m.endDate}`}
                  </p>
                )}
                {m.notes && (
                  <p className="text-secondary mt-1 italic leading-snug text-[10px]">
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
              className={`text-xs border border-outline-variant bg-surface-container-low ${
                compact ? 'rounded-lg px-2.5 py-1.5' : 'rounded-xl px-3 py-2'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-on-surface">{v.name}</span>
                <span
                  className={`font-semibold ${
                    st === 'overdue'
                      ? 'text-error'
                      : st === 'due-soon'
                      ? 'text-tertiary'
                      : st === 'up-to-date'
                      ? 'text-primary'
                      : 'text-on-surface-variant'
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
              {(v.lastDate || v.nextDueDate) && (
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  {v.lastDate && `Last: ${v.lastDate}`}
                  {v.lastDate && v.nextDueDate && ' · '}
                  {v.nextDueDate && `Next: ${v.nextDueDate}`}
                </p>
              )}
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
          <p className="text-xs bg-surface-container-low rounded-xl px-3 py-2 border border-outline-variant font-mono text-on-surface-variant italic flex items-center gap-1" title="This information is encrypted and only visible to the pet owner">
            <span>🔒</span> Encrypted
          </p>
        ) : (
          <p className="text-xs bg-surface-container-low rounded-xl px-3 py-2 border border-outline-variant font-mono text-on-surface break-all">
            {data.microchipId}
          </p>
        )
      ) : (
        <div className="flex items-center gap-2 text-sm bg-surface-container-low rounded-xl p-3 border border-outline-variant">
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">shield_off</span>
          <span className="text-on-surface-variant">Not Microchipped</span>
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
          ? 'bg-surface-container-low rounded-xl p-3 border border-outline-variant'
          : 'bg-surface-container-low rounded-2xl p-4 border border-outline-variant space-y-3 text-left'
      }
    >
      {data.emergencyContacts?.ownerPhone && (
        <div className="mb-2">
          <p className="text-xs text-on-surface-variant">Owner</p>
          <p className="font-medium text-on-surface text-sm">
            {data.emergencyContacts.ownerPhone}
          </p>
        </div>
      )}
      {data.emergencyContacts?.additionalContacts
        ?.filter(c => c.name || c.phone)
        .map((c, i) => (
          <div key={i} className="mb-2 last:mb-0">
            <p className="text-xs text-on-surface-variant">{c.name}</p>
            <p className="font-medium text-on-surface text-sm">{c.phone}</p>
          </div>
        ))}
      {!hasEmergencyData && (
        <p className="text-xs text-on-surface-variant italic">
          Secondary contact info is not on file.
        </p>
      )}
    </div>
  ) : null;

  // ── Section: vetInfo ──
  const vetInfoContent: React.ReactNode =
    sharing.vetInfo && data.emergencyContacts?.vetInfo ? (
      <div className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant">
        <p className="font-medium text-on-surface text-sm">
          {data.emergencyContacts!.vetInfo!.name}
        </p>
        <p className="text-xs text-on-surface-variant">{data.emergencyContacts!.vetInfo!.phone}</p>
        {data.emergencyContacts!.vetInfo!.address && (
          <p className="text-xs text-on-surface-variant">{data.emergencyContacts!.vetInfo!.address}</p>
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
    medications: null, // unified into medicalOverview — kept for backward-compat with saved fieldOrder arrays
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
    <div className={compact ? 'space-y-2' : 'divide-y divide-outline-variant'}>
      {orderedSections}
      {includeGeneralInfo && data.householdInfo && (
        <div className={compact ? 'py-1' : 'px-6 py-4'}>
          <h3 className="font-bold text-on-surface mb-1.5 uppercase tracking-wider text-xs flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px]">info</span> Household Information
          </h3>
          <p className="text-xs text-on-surface-variant bg-surface-container-low rounded-xl px-3 py-2 border border-outline-variant whitespace-pre-wrap break-words">
            {data.householdInfo}
          </p>
        </div>
      )}
    </div>
  );
}
