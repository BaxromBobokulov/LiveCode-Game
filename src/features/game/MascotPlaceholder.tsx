type MascotPlaceholderProps = {
  /** happy = menu pose, hit = game over pose. */
  mood: 'happy' | 'hit'
}

export function MascotPlaceholder({ mood }: MascotPlaceholderProps) {
  const isHit = mood === 'hit'

  return (
    <div aria-hidden className="relative inline-block select-none">
      {/* Glow behind the mascot */}
      <div className="absolute inset-0 scale-125 rounded-full bg-blue-500/20 blur-2xl" />

      <svg
        viewBox="0 0 280 260"
        className={`relative h-44 w-48 overflow-visible transition-transform duration-300 ${
          isHit ? 'rotate-12' : 'rotate-0'
        }`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground Shadow */}
        <ellipse
          cx="142"
          cy="242"
          rx={isHit ? '48' : '66'}
          ry="7.5"
          fill="#0C358C"
          opacity="0.75"
        />

        {/* Speed Lines (Bottom Left) */}
        {!isHit && (
          <g strokeLinecap="round">
            <line
              x1="16"
              y1="176"
              x2="66"
              y2="163"
              stroke="#BBD6FF"
              strokeWidth="6.5"
            />
            <line
              x1="23"
              y1="194"
              x2="74"
              y2="181"
              stroke="#F0F6FF"
              strokeWidth="6.5"
            />
          </g>
        )}

        {/* Exclamation / Action Sparks (Top Right) */}
        {!isHit && (
          <g fill="#0D74F5">
            <rect
              x="229"
              y="14"
              width="14"
              height="38"
              rx="7"
              transform="rotate(24 229 14)"
            />
            <rect
              x="262"
              y="35"
              width="14"
              height="36"
              rx="7"
              transform="rotate(52 262 35)"
            />
          </g>
        )}

        {/* Left Arm */}
        <path
          d={
            isHit
              ? 'M82 122 C44 134 42 168 78 168'
              : 'M78 134 C38 132 34 86 64 88 C78 89 82 104 82 104'
          }
          fill="#041133"
          stroke="#1D63ED"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Right Arm */}
        <path
          d={
            isHit
              ? 'M212 114 C242 126 240 158 208 154'
              : 'M212 112 C238 92 246 72 226 70 C212 69 208 86 208 86'
          }
          fill="#041133"
          stroke="#1D63ED"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Left Leg (Back) */}
        <path
          d={
            isHit
              ? 'M116 172 C104 202 88 218 106 226 C124 234 140 202 144 172'
              : 'M114 170 C92 188 74 214 92 225 C110 236 136 202 142 170'
          }
          fill="#041133"
          stroke="#1D63ED"
          strokeWidth="2.5"
        />

        {/* Right Leg (Front / Raised with Blue Sole) */}
        <g transform={isHit ? 'rotate(16 180 172)' : 'rotate(0)'}>
          <path
            d="M156 168 C164 196 184 212 204 200 C222 188 210 154 186 154"
            fill="#041133"
            stroke="#1D63ED"
            strokeWidth="2.5"
          />
          {/* Solid Dark Blue Foot Sole */}
          <ellipse
            cx="196"
            cy="177"
            rx="15"
            ry="22"
            transform="rotate(-24 196 177)"
            fill="#0B328A"
            stroke="#256BFD"
            strokeWidth="2"
          />
        </g>

        {/* 3D Body Extrusion (Thick Blue Side & Bottom Depth) */}
        <path
          d="M104 54 L82 61 C66 66 59 80 61 96 L71 158 C73 174 86 183 102 182 L192 172 L206 160 L104 54 Z"
          fill="#4E8EFF"
        />

        {/* Main White Terminal Frame */}
        <rect
          x="84"
          y="48"
          width="136"
          height="116"
          rx="26"
          transform="rotate(-7 152 106)"
          fill="#F8FAFC"
        />

        {/* Dark Navy Screen */}
        <rect
          x="96"
          y="60"
          width="112"
          height="92"
          rx="18"
          transform="rotate(-7 152 106)"
          fill="#041133"
        />

        {/* Screen Content */}
        <g transform="rotate(-7 152 106)">
          {/* Window Control Dots */}
          <circle cx="114" cy="76" r="5.5" fill="#FF4D4D" />
          <circle cx="130" cy="76" r="5.5" fill="#FFB82E" />
          <circle cx="146" cy="76" r="5.5" fill="#27C93F" />

          {/* Face Expressions */}
          {isHit ? (
            /* Game Over Pose: x_x */
            <g
              stroke="#F8FAFC"
              strokeWidth="7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="114" y1="98" x2="130" y2="114" />
              <line x1="130" y1="98" x2="114" y2="114" />
              <line x1="174" y1="98" x2="190" y2="114" />
              <line x1="190" y1="98" x2="174" y2="114" />
              <line x1="143" y1="128" x2="161" y2="128" strokeWidth="8" />
            </g>
          ) : (
            /* Happy Pose: >_< */
            <g
              stroke="#F8FAFC"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="114,96 132,107 114,118" />
              <polyline points="190,96 172,107 190,118" />
              <line x1="141" y1="128" x2="163" y2="128" strokeWidth="9" />
            </g>
          )}
        </g>
      </svg>
    </div>
  )
}