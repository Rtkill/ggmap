import L from 'leaflet';

// Helper to calculate darker gradient shade for 3D luxury depth
function adjustColorBrightness(hex: string, percent: number): string {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export function createCustomMarker(
  category: string,
  color: string = '#E74C3C',
  emoji: string = '🍽️'
): L.DivIcon {
  const cleanColor = color.replace('#', '');
  const gradId = `pin-grad-${cleanColor}`;
  const darkColor = adjustColorBrightness(color, -28);

  return L.divIcon({
    className: 'custom-luxury-marker',
    html: `
      <div class="marker-pin-wrapper" style="
        position: relative;
        width: 40px;
        height: 50px;
        cursor: pointer;
        will-change: transform;
        transform: translateZ(0);
        transition: transform 0.2s ease;
      ">
        <svg width="40" height="50" viewBox="0 0 44 56" fill="none" xmlns="http://www.w3.org/2000/svg" style="
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
        ">
          <defs>
            <linearGradient id="${gradId}" x1="6" y1="2" x2="38" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="${color}" />
              <stop offset="100%" stop-color="${darkColor}" />
            </linearGradient>
          </defs>

          <!-- Ground Contact Shadow -->
          <ellipse cx="22" cy="54" rx="7" ry="2" fill="rgba(0, 0, 0, 0.3)" />

          <!-- Main Pin Body -->
          <path
            d="M 22 2 C 10.954 2 2 10.954 2 22 C 2 34.5 22 52 22 52 C 22 52 42 34.5 42 22 C 42 10.954 33.046 2 22 2 Z"
            fill="url(#${gradId})"
            stroke="rgba(255, 255, 255, 0.65)"
            stroke-width="1.5"
          />

          <!-- Inner White Badge Ring -->
          <circle cx="22" cy="22" r="13.5" fill="#FFFFFF" stroke="rgba(0, 0, 0, 0.08)" stroke-width="1" />
        </svg>

        <!-- Centered Emoji Icon -->
        <div style="
          position: absolute;
          top: 7px;
          left: 6.5px;
          width: 27px;
          height: 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          line-height: 1;
          pointer-events: none;
          user-select: none;
        ">${emoji}</div>
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 48],
    popupAnchor: [0, -48],
  });
}
