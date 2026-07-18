// ViewingScoreGauge — a viewing-score (0–100) shown as a semicircular SVG gauge
// that floats above a map pin. Rendered as a Leaflet marker via L.divIcon, so
// the arc is hand-built SVG injected as marker HTML (not a React subtree).
//
// Web/Leaflet only. Reached exclusively through star-map.impl.web.tsx, which is
// itself lazy-loaded in the browser — so the `leaflet` import here never enters
// the native or SSR bundle.

import { divIcon } from 'leaflet';
import { useMemo } from 'react';
import { Marker } from 'react-leaflet';

// Gauge SVG math lives in the dependency-free ./gauge-svg so it can be reused off
// the map (e.g. the event modal). Re-exported here to preserve this module's
// original public surface.
import { gaugeSvgMarkup, scoreColor } from './gauge-svg';
import { dvw } from '@/utilities/responsive-dimensions';
export { gaugeSvgMarkup, scoreColor };

// --- divIcon assembly -------------------------------------------------------
// The whole gauge (backdrop + svg + optional label) floats this far above
// the pin coordinate so it clears the marker beneath it.
const FLOAT_GAP = 14;
const BOX_W = 62;
const GAUGE_BOX_H = 40;
const LABEL_BOX_H = 30;

function buildGaugeIcon(score: number, label?: string, subLabel?: string) {
  const hasLabel = Boolean(label || subLabel);
  const boxH = GAUGE_BOX_H + (hasLabel ? LABEL_BOX_H : 0);
  const cssBoxWidth = dvw(BOX_W);

  const labelHtml = hasLabel
    ? `<div style="margin-top:1px;text-align:center;line-height:1.15;">
        ${label ? `<div style="font-size:10px;font-weight:600;color:#dbe6f0;white-space:nowrap;">${label}</div>` : ''}
        ${subLabel ? `<div style="font-size:9px;color:#7d94aa;white-space:nowrap;">${subLabel}</div>` : ''}
      </div>`
    : '';

  const html = `<div style="
      display:flex;flex-direction:column;align-items:center;
      width:${cssBoxWidth};box-sizing:border-box;
      padding:3px 4px 4px;
      background:rgba(1,3,10,0.82);
      border:1px solid #0a1828;border-radius:8px;
      box-shadow:0 0 14px rgba(0,212,255,0.15);
      font-family:var(--font-display, sans-serif);
      pointer-events:none;">
      ${gaugeSvgMarkup(score)}
      ${labelHtml}
    </div>`;

  return divIcon({
    className: '', // suppress Leaflet's default white box
    html,
    iconSize: [BOX_W, boxH],
    iconAnchor: [BOX_W / 2, boxH + FLOAT_GAP], // bottom-center sits above the pin
  });
}

export interface ViewingScoreGaugeProps {
  /** Pin coordinate the gauge floats above, [lat, lon]. */
  position: [number, number];
  /** Viewing score 0–100. */
  score: number;
  /** Optional line under the gauge, e.g. "18 mi NW". */
  label?: string;
  /** Optional smaller second line, e.g. "27 min away". */
  subLabel?: string;
  /** Higher = drawn above other markers. */
  zIndexOffset?: number;
}

/**
 * A non-interactive marker: purely a floating gauge. Only render this for the
 * user's location and the best nearby spot — never for arbitrary points.
 */
export function ViewingScoreGauge({
  position,
  score,
  label,
  subLabel,
  zIndexOffset = 1000,
}: ViewingScoreGaugeProps) {
  const icon = useMemo(
    () => buildGaugeIcon(score, label, subLabel),
    [score, label, subLabel]
  );

  // Guard: Leaflet throws "Invalid LatLng object: (NaN, NaN)" if a coordinate is
  // NaN/undefined. Never let a bad score/spot payload crash the whole map.
  if (!Number.isFinite(position?.[0]) || !Number.isFinite(position?.[1])) {
    return null;
  }

  return (
    <Marker
      position={position}
      icon={icon}
      interactive={false}
      keyboard={false}
      zIndexOffset={zIndexOffset}
    />
  );
}
