interface Props {
  message?: string;
}

export default function LoadingOverlay({ message = 'Guardando...' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 bg-white rounded-2xl px-10 py-8 shadow-2xl">
        {/* Emblem */}
        <div className="relative w-20 h-20">
          {/* Spinning ring */}
          <svg
            className="absolute inset-0 animate-spin"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="40" cy="40" r="36" stroke="#dbeafe" strokeWidth="6" />
            <path
              d="M40 4 a36 36 0 0 1 36 36"
              stroke="#2563eb"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>

          {/* Center emblem */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              viewBox="0 0 48 48"
              className="w-11 h-11"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Belt shape */}
              <rect x="4" y="20" width="40" height="8" rx="4" fill="#1d4ed8" />
              <rect x="20" y="16" width="8" height="16" rx="2" fill="#1e40af" />
              {/* Knot center */}
              <rect x="22" y="19" width="4" height="10" rx="1" fill="#60a5fa" />
              {/* JJ letters */}
              <text
                x="24"
                y="14"
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fontFamily="system-ui, sans-serif"
                fill="#1d4ed8"
                letterSpacing="1"
              >
                JJP
              </text>
            </svg>
          </div>
        </div>

        {/* Message */}
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">{message}</p>
          <p className="text-xs text-gray-400 mt-0.5">JJ Platform</p>
        </div>
      </div>
    </div>
  );
}
