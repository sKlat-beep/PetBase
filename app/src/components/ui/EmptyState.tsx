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
      <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-5">
        <div className="text-on-surface-variant [&_svg]:w-10 [&_svg]:h-10">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-on-surface mb-2">{title}</h3>
      <p className="text-sm text-on-surface-variant max-w-xs mb-5 leading-relaxed">{description}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="px-5 py-2.5 min-h-[44px] bg-primary-container text-on-primary-container rounded-xl text-sm font-medium hover:opacity-90 transition-colors"
        >
          {cta.label}
        </button>
      )}
    </Wrapper>
  );
}
