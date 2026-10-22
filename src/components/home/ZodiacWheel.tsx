const signs = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi']

export function ZodiacWheel() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      <svg viewBox="0 0 420 420" className="h-full w-full" role="img" aria-label="Decorative zodiac wheel">
        <defs>
          <radialGradient id="wheel-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2a1a48" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#120c1e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#07040f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="gold-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e8c96a" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#8a7020" />
          </linearGradient>
        </defs>
        <circle cx="210" cy="210" r="200" fill="url(#wheel-glow)" />
        <circle cx="210" cy="210" r="168" fill="none" stroke="url(#gold-ring)" strokeWidth="1.25" opacity="0.85" />
        <circle cx="210" cy="210" r="132" fill="none" stroke="#d4af37" strokeWidth="0.6" opacity="0.35" />
        <circle cx="210" cy="210" r="88" fill="none" stroke="#b8a9c9" strokeWidth="0.5" opacity="0.35" />
        {signs.map((sign, index) => {
          const angle = (index / signs.length) * Math.PI * 2 - Math.PI / 2
          const x = 210 + Math.cos(angle) * 150
          const y = 210 + Math.sin(angle) * 150
          const lx = 210 + Math.cos(angle) * 110
          const ly = 210 + Math.sin(angle) * 110
          return (
            <g key={sign}>
              <line
                x1={210 + Math.cos(angle) * 88}
                y1={210 + Math.sin(angle) * 88}
                x2={210 + Math.cos(angle) * 168}
                y2={210 + Math.sin(angle) * 168}
                stroke="#d4af37"
                strokeWidth="0.5"
                opacity="0.35"
              />
              <circle cx={lx} cy={ly} r="2" fill="#e8c96a" opacity="0.8" />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#f4ead8"
                fontSize="13"
                fontFamily="Cormorant Garamond, serif"
                opacity="0.9"
              >
                {sign}
              </text>
            </g>
          )
        })}
        <circle cx="210" cy="210" r="46" fill="#151022" stroke="#d4af37" strokeWidth="1" />
        <path
          d="M222 192c-6 9-6.5 21 .4 30.4 5.6 7.8 4.5 16-.8 20.5 14.2-3.8 24.4-17.2 24.4-32.6 0-12-6.4-22.4-15.8-28.1-1.5 3.7-3.4 6.7-8.2 9.8z"
          fill="#d4af37"
        />
        <path
          d="M196 190l2.4 7.2 7.6.4-6 4.8 2.1 7.2-6.1-4.4-6.2 4.4 2.1-7.2-6-4.8 7.6-.4z"
          fill="#f4ead8"
        />
      </svg>
    </div>
  )
}
