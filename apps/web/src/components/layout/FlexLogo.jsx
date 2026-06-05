export default function FlexLogo({ className = '' }) {
  return (
    <svg
      viewBox="0 0 160 60"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="FLEX Live Sessions"
    >
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#f0c040" />
          <stop offset="100%" stopColor="#a87010" />
        </linearGradient>
      </defs>

      {/* FLEX */}
      <text
        x="2"
        y="42"
        fontFamily="Georgia, serif"
        fontSize="44"
        fontWeight="bold"
        fontStyle="italic"
        fill="url(#g1)"
        letterSpacing="1"
      >FLEX</text>

      {/* Línea separadora */}
      <line x1="2" y1="48" x2="158" y2="48" stroke="#a87010" strokeWidth="0.7" opacity="0.7" />

      {/* LIVE SESSIONS */}
      <text
        x="2"
        y="58"
        fontFamily="Georgia, serif"
        fontSize="9"
        letterSpacing="4"
        fill="#c8960c"
        opacity="0.9"
      >LIVE SESSIONS</text>
    </svg>
  )
}
