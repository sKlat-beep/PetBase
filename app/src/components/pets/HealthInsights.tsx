import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import type { Pet } from '../../types/pet';

// Deterministic rule-based insights (no API needed)
function generateInsights(pet: Pet): string[] {
  const insights: string[] = [];
  const vaccines = (pet as any).vaccines as Array<{ name: string; nextDueDate?: string }> | undefined;
  const meds = (pet as any).medications as Array<{ name: string; endDate?: string }> | undefined;
  const today = new Date().toISOString().split('T')[0];

  // Weight-based
  if (pet.bodyConditionScore === 'Overweight') {
    insights.push(`Consider adjusting ${pet.name}'s diet or increasing activity — overweight pets are at higher risk for joint issues.`);
  }

  // Vaccine-based
  const overdueCount = (vaccines ?? []).filter(v => v.nextDueDate && v.nextDueDate < today).length;
  if (overdueCount > 0) {
    insights.push(`${pet.name} has ${overdueCount} overdue vaccine${overdueCount > 1 ? 's' : ''}. Schedule a vet visit to catch up.`);
  }

  // Age-based
  if (pet.birthday) {
    const ageYears = (Date.now() - new Date(pet.birthday).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears > 7 && pet.type?.toLowerCase() === 'dog') {
      insights.push(`At ${Math.floor(ageYears)} years old, ${pet.name} is a senior dog. Consider twice-yearly vet checkups.`);
    }
    if (ageYears > 10 && pet.type?.toLowerCase() === 'cat') {
      insights.push(`At ${Math.floor(ageYears)}, ${pet.name} is a senior cat. Watch for weight changes and dental health.`);
    }
    if (ageYears < 1) {
      insights.push(`${pet.name} is still growing! Ensure they're on an age-appropriate diet with proper nutrition.`);
    }
  }

  // Medication-based
  const activeMeds = (meds ?? []).filter(m => !m.endDate || m.endDate >= today);
  if (activeMeds.length >= 3) {
    insights.push(`${pet.name} is on ${activeMeds.length} medications. Discuss potential interactions with your vet.`);
  }

  // Vet visit frequency
  if (pet.lastVet) {
    const lastVisit = new Date(pet.lastVet);
    const monthsSince = (Date.now() - lastVisit.getTime()) / (30 * 24 * 60 * 60 * 1000);
    if (monthsSince > 12) {
      insights.push(`It's been over ${Math.floor(monthsSince)} months since ${pet.name}'s last vet visit. Annual checkups are recommended.`);
    }
  } else {
    insights.push(`No vet visit recorded for ${pet.name}. Regular checkups help catch issues early.`);
  }

  // Mood-based (if mood log exists)
  const moodLog = pet.moodLog ?? [];
  const recentSick = moodLog.filter(e => e.mood === 'sick' && Date.now() - new Date(e.date).getTime() < 7 * 24 * 60 * 60 * 1000);
  if (recentSick.length >= 2) {
    insights.push(`${pet.name} has been logged as "sick" ${recentSick.length} times this week. Consider a vet consultation.`);
  }

  return insights.slice(0, 3); // Max 3 insights
}

interface HealthInsightsProps {
  pet: Pet;
}

export function HealthInsights({ pet }: HealthInsightsProps) {
  const [insights] = useState(() => generateInsights(pet));

  if (insights.length === 0) return null;

  return (
    <div className="space-y-2 mt-3">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Smart Insights</p>
      </div>
      {insights.map((insight, i) => (
        <div key={i} className="px-3 py-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{insight}</p>
        </div>
      ))}
      <p className="text-[10px] text-neutral-400 italic">These are general suggestions — always consult your licensed veterinarian.</p>
    </div>
  );
}
