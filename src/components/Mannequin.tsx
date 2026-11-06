import { useMemo } from 'react';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

import { computeBody, FIGURE_ASPECT, type MannequinParams } from '@/lib/body';

type Pt = [number, number];

/** Converte una spezzata in una curva morbida (Catmull-Rom -> Bézier cubiche), chiusa. */
function smoothClosedPath(points: Pt[]): string {
  const n = points.length;
  const p = (i: number) => points[(i + n) % n];
  let d = `M ${p(0)[0].toFixed(2)} ${p(0)[1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(2)} ${c1[1].toFixed(2)}, ${c2[0].toFixed(2)} ${c2[1].toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return `${d} Z`;
}

/** Manichino 2D disegnato in base alle misure dell'utente. */
export function Mannequin({ params, width }: { params: MannequinParams; width: number }) {
  const height = width * FIGURE_ASPECT;

  const shapes = useMemo(() => {
    const b = computeBody(params);
    const X = (dx: number) => (0.5 + dx) * width;
    const Y = (y: number) => y * height;
    const P = (dx: number, y: number): Pt => [X(dx), Y(y)];

    const legCx = b.hipW / 2 - b.thighW / 2;
    const midThighY = (b.crotchY + b.kneeY) / 2;

    // Metà destra del corpo (dall'alto, lato esterno, poi lato interno della gamba).
    const right: Pt[] = [
      P(b.neckW / 2, b.chinY + 0.004),
      P((b.neckW / 2) * 1.12, b.shoulderY - 0.024),
      P(b.shoulderW * 0.3, b.shoulderY - 0.008),
      P(b.shoulderW / 2 - b.armW * 0.3, b.shoulderY + 0.012),
      P(b.chestW / 2, b.armpitY),
      P(b.chestW / 2, b.chestY),
      P(b.waistW / 2, b.waistY),
      P(b.hipW / 2, b.hipY),
      P((b.hipW / 2) * 0.97, b.crotchY + 0.02),
      P(legCx + (b.thighW / 2) * 0.9, midThighY),
      P(legCx + b.kneeW / 2, b.kneeY),
      P(legCx + (b.calfW / 2) * 1.05, b.calfY),
      P(legCx + b.ankleW / 2, b.ankleY),
      P(legCx + b.ankleW / 2 + 0.01, b.footY - 0.004),
      P(legCx - b.ankleW * 0.25, b.footY),
      P(legCx - b.ankleW / 2, b.ankleY),
      P(legCx - (b.calfW / 2) * 0.8, b.calfY),
      P(legCx - b.kneeW / 2, b.kneeY),
      P(legCx - (b.thighW / 2) * 0.85, midThighY),
      P(0.006, b.crotchY + 0.008),
    ];
    const left = right.map(([x, y]): Pt => [width - x, y]).reverse();
    const body = smoothClosedPath([...right, ...left]);

    const sx = b.shoulderW / 2;
    const arm = (side: 1 | -1) => {
      const pts: Pt[] = [
        P(sx - b.armW * 0.55, b.shoulderY - 0.004),
        P(sx + b.armW * 0.2, b.shoulderY + 0.022),
        P(sx + b.armW * 0.3, b.elbowY),
        P(sx + b.armW * 0.5, b.wristY),
        P(sx + b.armW * 0.6, b.handY - 0.022),
        P(sx + b.armW * 0.2, b.handY),
        P(sx + b.armW * 0.5 - b.forearmW * 1.05, b.handY - 0.028),
        P(sx + b.armW * 0.5 - b.forearmW, b.wristY),
        P(sx + b.armW * 0.3 - b.armW * 0.95, b.elbowY),
        P(b.chestW / 2 - 0.004, b.armpitY + 0.006),
      ];
      return smoothClosedPath(side === 1 ? pts : pts.map(([x, y]): Pt => [width - x, y]));
    };

    return {
      body,
      armR: arm(1),
      armL: arm(-1),
      head: {
        cx: X(0),
        cy: Y((b.headTopY + b.chinY) / 2),
        rx: (b.headW / 2) * width,
        ry: ((b.chinY - b.headTopY) / 2) * height,
      },
    };
  }, [params, width, height]);

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="skin" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#D9DCE2" />
          <Stop offset="0.3" stopColor="#F4F5F7" />
          <Stop offset="0.5" stopColor="#FFFFFF" />
          <Stop offset="0.7" stopColor="#F4F5F7" />
          <Stop offset="1" stopColor="#D9DCE2" />
        </LinearGradient>
      </Defs>
      <Path d={shapes.armR} fill="url(#skin)" stroke="#CCD0D7" strokeWidth={1} />
      <Path d={shapes.armL} fill="url(#skin)" stroke="#CCD0D7" strokeWidth={1} />
      <Path d={shapes.body} fill="url(#skin)" stroke="#CCD0D7" strokeWidth={1} />
      <Ellipse {...shapes.head} fill="url(#skin)" stroke="#CCD0D7" strokeWidth={1} />
    </Svg>
  );
}
