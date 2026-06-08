import Svg, { Circle, Path, Text as SvgText, G } from 'react-native-svg';

interface Props {
  width?: number;
}

// viewBox: 0 0 260 68
export function TripOrbitWordmark({ width = 260 }: Props) {
  const height = Math.round(width * (68 / 260));

  return (
    <Svg width={width} height={height} viewBox="0 0 260 68">
      {/* ── "trip" in dark serif italic ── */}
      <SvgText
        x="2"
        y="56"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="54"
        fontStyle="italic"
        fontWeight="400"
        fill="#111827"
      >
        trip
      </SvgText>

      {/* ── Interlocking "OO" rings ── */}
      {/* Left ring */}
      <Circle
        cx="140"
        cy="36"
        r="21"
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="4"
      />
      {/* Right ring — overlaps left by ~10px */}
      <Circle
        cx="158"
        cy="36"
        r="21"
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="4"
      />

      {/* ── Map pin above the rings ── */}
      <G transform="translate(141, 0)">
        {/* Teardrop body */}
        <Path
          d="M8 0 C3.6 0 0 3.6 0 8 C0 13.5 8 21 8 21 C8 21 16 13.5 16 8 C16 3.6 12.4 0 8 0 Z"
          fill="#1d4ed8"
        />
        {/* Star inside */}
        <Path
          d="M8 4 L9.2 7 L12.5 7 L9.8 8.8 L10.8 12 L8 10.2 L5.2 12 L6.2 8.8 L3.5 7 L6.8 7 Z"
          fill="#ffffff"
        />
      </G>

      {/* ── "rbit" in blue serif italic ── */}
      <SvgText
        x="177"
        y="56"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="54"
        fontStyle="italic"
        fontWeight="400"
        fill="#1d4ed8"
      >
        rbit
      </SvgText>
    </Svg>
  );
}
