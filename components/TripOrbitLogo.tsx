import Svg, {
  Circle,
  Path,
  G,
  Line,
  Ellipse,
} from 'react-native-svg';

interface Props {
  size?: number;
}

export function TripOrbitLogo({ size = 100 }: Props) {
  const vb = 120;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`}>
      {/* ── Outer circle ring ── */}
      <Circle cx="60" cy="60" r="56" fill="none" stroke="#111827" strokeWidth="2" />

      {/* ── Globe base ── */}
      <Circle cx="60" cy="60" r="32" fill="#f0f4ff" stroke="#111827" strokeWidth="1.5" />

      {/* Latitude lines */}
      <Ellipse cx="60" cy="60" rx="32" ry="9" fill="none" stroke="#94a3b8" strokeWidth="0.8" />
      <Ellipse cx="60" cy="60" rx="32" ry="20" fill="none" stroke="#94a3b8" strokeWidth="0.6" />

      {/* Longitude lines */}
      <Path
        d="M60 28 Q72 44 60 60 Q48 76 60 92"
        fill="none" stroke="#94a3b8" strokeWidth="0.8"
      />
      <Path
        d="M60 28 Q50 44 60 60 Q70 76 60 92"
        fill="none" stroke="#94a3b8" strokeWidth="0.8"
      />
      {/* Clip globe content – vertical bounds */}
      {/* We just rely on the globe circle masking visually */}

      {/* ── Simplified continents ── */}
      {/* North America */}
      <Path
        d="M36 42 Q38 37 43 38 Q48 36 50 40 Q52 44 49 48 Q45 51 41 49 Q37 47 36 42Z"
        fill="#1e3a6e"
      />
      {/* South America */}
      <Path
        d="M42 53 Q44 50 47 51 Q50 53 49 58 Q48 63 45 65 Q42 64 41 59 Q40 55 42 53Z"
        fill="#1e3a6e"
      />
      {/* Europe */}
      <Path
        d="M58 39 Q61 36 65 37 Q68 39 67 43 Q65 46 62 46 Q58 45 57 42 Q57 40 58 39Z"
        fill="#1e3a6e"
      />
      {/* Africa */}
      <Path
        d="M59 48 Q62 46 65 47 Q68 50 67 56 Q66 62 63 64 Q60 64 58 61 Q56 57 57 52 Q57 49 59 48Z"
        fill="#1e3a6e"
      />
      {/* Asia */}
      <Path
        d="M68 38 Q72 35 78 37 Q82 40 80 44 Q78 47 73 47 Q69 46 67 43 Q67 40 68 38Z"
        fill="#1e3a6e"
      />

      {/* ── Connection lines between pins ── */}
      <Line x1="41" y1="47" x2="63" y2="42" stroke="#2563eb" strokeWidth="0.9" strokeDasharray="2,2" />
      <Line x1="63" y1="42" x2="75" y2="42" stroke="#2563eb" strokeWidth="0.9" strokeDasharray="2,2" />

      {/* ── Map pins ── */}
      {/* Pin at North America */}
      <Circle cx="41" cy="47" r="2.2" fill="#2563eb" />
      <Path d="M41 44.8 L39.2 42 L42.8 42 Z" fill="#2563eb" />

      {/* Pin at Europe */}
      <Circle cx="63" cy="42" r="2.2" fill="#2563eb" />
      <Path d="M63 39.8 L61.2 37 L64.8 37 Z" fill="#2563eb" />

      {/* Pin at Asia */}
      <Circle cx="75" cy="42" r="2.2" fill="#2563eb" />
      <Path d="M75 39.8 L73.2 37 L76.8 37 Z" fill="#2563eb" />

      {/* ── Blue orbital swoosh arc ── */}
      {/* Bottom arc going from lower-left sweeping up to upper-right */}
      <Path
        d="M18 72 Q40 15 102 48"
        fill="none"
        stroke="#2563eb"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* ── Airplane at the end of the arc (top-right area) ── */}
      <G transform="translate(96, 38) rotate(20)">
        {/* Fuselage */}
        <Path d="M-7 0 L7 0 L5 -2 L-7 0Z" fill="#111827" />
        <Path d="M-7 0 L7 0 L5 2 L-7 0Z" fill="#111827" />
        {/* Wings */}
        <Path d="M-1 0 L3 -6 L5 -5 L1 0Z" fill="#111827" />
        <Path d="M-1 0 L3 6 L5 5 L1 0Z" fill="#111827" />
        {/* Tail */}
        <Path d="M-7 0 L-5 -3 L-4 -2 L-7 0Z" fill="#111827" />
        <Path d="M-7 0 L-5 3 L-4 2 L-7 0Z" fill="#111827" />
      </G>

      {/* ── Person silhouettes flanking the globe ── */}
      {/* Left person */}
      <G transform="translate(5, 43)">
        {/* Head */}
        <Circle cx="6" cy="5" r="5" fill="#111827" />
        {/* Body */}
        <Path d="M1 12 Q6 9 11 12 L13 26 L-1 26 Z" fill="#111827" />
      </G>

      {/* Right person */}
      <G transform="translate(104, 43)">
        {/* Head */}
        <Circle cx="6" cy="5" r="5" fill="#111827" />
        {/* Body */}
        <Path d="M1 12 Q6 9 11 12 L13 26 L-1 26 Z" fill="#111827" />
      </G>
    </Svg>
  );
}
