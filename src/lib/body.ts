import type { CategoryId } from '@/constants/categories';
import { slotOf } from '@/constants/categories';

/**
 * Geometria della figura.
 *
 * Tutte le coordinate sono normalizzate rispetto al riquadro della figura:
 * x in [0..1] sulla larghezza, y in [0..1] sull'altezza.
 * Il riquadro ha sempre proporzione altezza = FIGURE_ASPECT × larghezza.
 */
export const FIGURE_ASPECT = 2;

export type Gender = 'male' | 'female';

export type MannequinParams = {
  gender: Gender;
  heightCm: number;
  weightKg: number;
  shouldersCm: number;
  chestCm: number;
};

export const DEFAULT_MANNEQUIN: Record<Gender, MannequinParams> = {
  male: { gender: 'male', heightCm: 178, weightKg: 75, shouldersCm: 46, chestCm: 98 },
  female: { gender: 'female', heightCm: 165, weightKg: 60, shouldersCm: 39, chestCm: 90 },
};

export const MANNEQUIN_LIMITS = {
  heightCm: { min: 140, max: 210, step: 1 },
  weightKg: { min: 40, max: 150, step: 1 },
  shouldersCm: { min: 32, max: 60, step: 1 },
  chestCm: { min: 70, max: 140, step: 1 },
} as const;

/** Spazio verticale occupato dal corpo nel riquadro. */
const BODY_TOP = 0.02;
const BODY_SPAN = 0.96;

/** Converte una frazione dell'altezza corporea (0 = testa, 1 = piedi) in y normalizzata. */
const yAt = (fraction: number) => BODY_TOP + fraction * BODY_SPAN;

export type Body = {
  /** Larghezze (normalizzate sulla larghezza del riquadro). */
  headW: number;
  neckW: number;
  shoulderW: number;
  chestW: number;
  waistW: number;
  hipW: number;
  thighW: number;
  kneeW: number;
  calfW: number;
  ankleW: number;
  armW: number;
  forearmW: number;
  /** Quote verticali (normalizzate sull'altezza del riquadro). */
  headTopY: number;
  chinY: number;
  shoulderY: number;
  armpitY: number;
  chestY: number;
  waistY: number;
  hipY: number;
  crotchY: number;
  kneeY: number;
  calfY: number;
  ankleY: number;
  footY: number;
  elbowY: number;
  wristY: number;
  handY: number;
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Calcola le proporzioni del corpo a partire dalle misure dell'utente. */
export function computeBody(p: MannequinParams): Body {
  const female = p.gender === 'female';
  const heightM = p.heightCm / 100;
  const bmi = clamp(p.weightKg / (heightM * heightM), 15, 45);
  const fat = bmi - 22;

  // Pixel per centimetro espressi in unità di larghezza del riquadro.
  const perCm = (BODY_SPAN * FIGURE_ASPECT) / p.heightCm;

  // Circonferenze stimate (cm) -> larghezze frontali.
  const chestCirc = p.chestCm;
  const waistCirc = female ? chestCirc * 0.76 + fat * 1.6 : chestCirc * 0.84 + fat * 1.8;
  const hipCirc = female ? chestCirc * 1.08 + fat * 1.3 : chestCirc * 0.98 + fat * 1.1;
  const front = (circ: number) => circ * 0.33 * perCm;

  const bulk = Math.sqrt(bmi / 22);

  const shoulderW = p.shouldersCm * perCm;
  const chestW = Math.min(front(chestCirc), shoulderW * 0.92);
  const waistW = front(waistCirc);
  const hipW = Math.max(front(hipCirc), waistW * 1.02);

  return {
    headW: 15.5 * perCm,
    neckW: (female ? 9.5 : 11) * perCm * Math.sqrt(bulk),
    shoulderW,
    chestW,
    waistW,
    hipW,
    thighW: hipW * 0.56,
    kneeW: hipW * 0.33,
    calfW: hipW * 0.34,
    ankleW: hipW * 0.19,
    armW: (female ? 9.5 : 11.5) * perCm * bulk,
    forearmW: (female ? 7 : 8.5) * perCm * bulk,
    headTopY: yAt(0),
    chinY: yAt(0.125),
    shoulderY: yAt(0.18),
    armpitY: yAt(0.235),
    chestY: yAt(0.27),
    waistY: yAt(female ? 0.38 : 0.4),
    hipY: yAt(0.48),
    crotchY: yAt(0.52),
    kneeY: yAt(0.73),
    calfY: yAt(0.8),
    ankleY: yAt(0.955),
    footY: yAt(1),
    elbowY: yAt(0.385),
    wristY: yAt(0.5),
    handY: yAt(0.575),
  };
}

/** Regolazioni fatte dall'utente su un capo indossato. */
export type Fit = {
  /** Spostamento del centro (normalizzato). */
  dx: number;
  dy: number;
  /** Fattori di scala in larghezza e altezza. */
  sx: number;
  sy: number;
};

export const DEFAULT_FIT: Fit = { dx: 0, dy: 0, sx: 1, sy: 1 };

export type Frame = { x: number; y: number; w: number; h: number };

/**
 * Riquadro di default di un capo sulla figura, calcolato dai punti del corpo
 * e dalle proporzioni della foto del capo (aspect = larghezza / altezza).
 */
export function defaultGarmentFrame(body: Body, category: CategoryId, aspect: number): Frame {
  const a = aspect > 0 ? aspect : 1;
  if (slotOf(category) === 'bottom') {
    const y = body.waistY - 0.012;
    const h = body.ankleY + 0.012 - y;
    let w = h * FIGURE_ASPECT * a;
    w = clamp(w, body.hipW * 0.9, body.hipW * 1.9);
    return { x: 0.5 - w / 2, y, w, h };
  }

  const widthFactor: Record<CategoryId, number> = {
    canotte: 0,
    maglie: 1.55,
    camicie: 1.55,
    felpe: 1.62,
    giacche: 1.7,
    pantaloni: 1,
  };
  const w =
    category === 'canotte' ? Math.max(body.chestW * 1.3, body.shoulderW * 0.95) : body.shoulderW * widthFactor[category];
  let h = w / (FIGURE_ASPECT * a);
  // Evita capi sproporzionati se la foto ha un ritaglio strano.
  h = clamp(h, (body.hipY - body.shoulderY) * 0.85, (body.kneeY - body.shoulderY) * 1.1);
  const y = body.shoulderY - (category === 'canotte' ? 0.012 : 0.03);
  return { x: 0.5 - w / 2, y, w, h };
}

export function applyFit(frame: Frame, fit: Fit): Frame {
  const cx = frame.x + frame.w / 2 + fit.dx;
  const cy = frame.y + frame.h / 2 + fit.dy;
  const w = frame.w * fit.sx;
  const h = frame.h * fit.sy;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}
