import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon, title, description, cta }: EmptyStateProps) {
  const reducedMotion = useReducedMotion();

  const Wrapper = reducedMotion ? 'div' : motion.div;
  const wrapperProps = reducedMotion ? {} : {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35 },
  };

  return (
    <Wrapper {...wrapperProps as any} className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-stone-100 dark:bg-stone-700/50 flex items-center justify-center mb-5">
        <div className="text-stone-400 dark:text-stone-500 [&_svg]:w-10 [&_svg]:h-10">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-stone-700 dark:text-stone-200 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 max-w-xs mb-5 leading-relaxed">{description}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="px-5 py-2.5 min-h-[44px] bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-stone-800"
        >
          {cta.label}
        </button>
      )}
    </Wrapper>
  );
}
