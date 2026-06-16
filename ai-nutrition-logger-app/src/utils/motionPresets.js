// Shared framer-motion variants. Kept subtle and transform-only so nothing
// reflows mid-animation (fade + small translate/scale, never width/height of
// surrounding boxes).

const EASE = [0.25, 0.46, 0.45, 0.94];

// Parent: reveals children one after another on mount.
export const staggerContainer = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.03 },
  },
};

// Child: rise + fade into place.
export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

// Child: gentle pop (for grids / cards).
export const popIn = {
  hidden: { opacity: 0, scale: 0.94, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};

// Modal backdrop + panel.
export const modalBackdrop = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalPanel = {
  hidden: { opacity: 0, scale: 0.9, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 26 } },
  exit: { opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.12 } },
};

// Tap feedback for the neo-brutalist buttons (mirrors the active:translate look).
export const pressable = {
  whileTap: { scale: 0.97 },
};
