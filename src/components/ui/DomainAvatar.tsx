"use client";

import { useState } from 'react';

interface DomainAvatarProps {
  domain: string;
  className?: string;
  size?: number;
}

export function DomainAvatar({ domain, className, size = 40 }: DomainAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Use DiceBear HTTP API with identicon style for clean geometric patterns
  const avatarUrl = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(domain)}&size=${size}&backgroundColor=eeeeff`;

  // Fallback to initials if there's an error
  if (imageError) {
    return (
      <div
        className={`rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center ${className || ''}`}
        style={{ width: size, height: size }}
      >
        <span className="text-white font-semibold text-sm">
          {domain.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-full overflow-hidden ${className || ''}`}
      style={{ width: size, height: size }}
    >
      <img
        src={avatarUrl}
        alt={`${domain} avatar`}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    </div>
  );
}