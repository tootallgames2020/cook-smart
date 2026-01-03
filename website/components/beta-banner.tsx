'use client';

import React from 'react';
import Link from 'next/link';

export function BetaBanner(): React.ReactElement {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) {
    return <></>;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 relative">
      <div className="container mx-auto flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm">
            🎉 BETA
          </span>
          <p className="text-sm md:text-base font-medium">
            <strong>100% FREE during BETA!</strong> Join now and help shape the future of Cook
            Smart.
          </p>
        </div>
        <Link
          href="/contact/"
          className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors"
        >
          Join Beta →
        </Link>
        <button
          onClick={() => setIsVisible(false)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white transition-colors"
          aria-label="Close banner"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
