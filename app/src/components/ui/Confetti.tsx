import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

const COLORS = ['#facc15', '#ec4899', '#10b981', '#38bdf8', '#a78bfa', '#f97316'];
const PARTICLE_COUNT = 30;

interface ConfettiProps {
  active: boolean;
  duration?: number;
}

export function Confetti({ active, duration = 3000 }: ConfettiProps) {
  const reducedMotion = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), duration);
    return () => clearTimeout(t);
  }, [active, duration]);

  if (reducedMotion || !show) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden" aria-hidden="true">
      {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const size = 6 + Math.random() * 6;
        const color = COLORS[i % COLORS.length];
        const rotation = Math.random() * 720 - 360;

        return (
          <motion.div
            key={i}
            initial={{ y: -20, x: `${left}vw`, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ y: '105vh', opacity: 0, rotate: rotation, scale: 0.5 }}
            transition={{ duration: 2 + Math.random() * 1.5, delay, ease: 'easeIn' }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        );
      })}
    </div>
  );
}

// Hook for triggering confetti on milestone events
const MILESTONE_KEY = 'petbase-celebrated-milestones';

function getCelebratedMilestones(): Set<string> {
  try {
    const raw = localStorage.getItem(MILESTONE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markCelebrated(milestone: string) {
  const set = getCelebratedMilestones();
  set.add(milestone);
  localStorage.setItem(MILESTONE_KEY, JSON.stringify([...set]));
}

export function useCelebration() {
  const [active, setActive] = useState(false);

  function celebrate(milestoneId: string) {
    const celebrated = getCelebratedMilestones();
    if (celebrated.has(milestoneId)) return;
    markCelebrated(milestoneId);
    setActive(true);
    setTimeout(() => setActive(false), 3500);
  }

  return { confettiActive: active, celebrate };
}
