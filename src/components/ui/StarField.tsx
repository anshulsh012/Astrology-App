const stars = [
  { top: '8%', left: '12%', size: 2, opacity: 0.7 },
  { top: '14%', left: '78%', size: 1.5, opacity: 0.5 },
  { top: '22%', left: '42%', size: 2, opacity: 0.4 },
  { top: '31%', left: '88%', size: 1.5, opacity: 0.65 },
  { top: '38%', left: '6%', size: 1, opacity: 0.45 },
  { top: '46%', left: '64%', size: 2, opacity: 0.55 },
  { top: '58%', left: '18%', size: 1.5, opacity: 0.35 },
  { top: '67%', left: '92%', size: 2, opacity: 0.5 },
  { top: '74%', left: '48%', size: 1, opacity: 0.4 },
  { top: '82%', left: '28%', size: 1.5, opacity: 0.3 },
]

export function StarField() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((star, index) => (
        <span
          key={index}
          className="absolute rounded-full bg-cream"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  )
}
