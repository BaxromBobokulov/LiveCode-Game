// Small inline icons. They are decorative: the text next to them (or the
// button's aria-label) carries the meaning, so they are hidden from screen readers.

type IconProps = { className?: string }

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  'aria-hidden': true,
} as const

export function PlayIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
    </svg>
  )
}

export function PauseIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      <rect x="6" y="4.5" width="4" height="15" rx="1.25" />
      <rect x="14" y="4.5" width="4" height="15" rx="1.25" />
    </svg>
  )
}

export function TrophyIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg {...svgProps} className={className}>
      {/* cup */}
      <path d="M7 3h10v6a5 5 0 0 1-10 0V3Z" />
      {/* handles */}
      <path
        d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* stem and base */}
      <path d="M11 13.5h2V17h-2zM8 17h8a1 1 0 0 1 1 1v3H7v-3a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

export function ArrowLeftIcon({ className = 'size-5' }: IconProps) {
  return (
    <svg
      {...svgProps}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}
