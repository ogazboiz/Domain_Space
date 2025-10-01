"use client";

import { useState } from 'react';

interface ChatAvatarProps {
  address: string;
  className?: string;
  size?: number;
}

export function ChatAvatar({ address, className, size = 40 }: ChatAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Normalize address: lowercase and remove CAIP-10 prefix if present
  const normalizedAddress = address.includes(':') 
    ? address.split(':')[2]?.toLowerCase() || address.toLowerCase()
    : address.toLowerCase();

  // Use DiceBear HTTP API with personas style for human-like chat avatars
  const avatarUrl = `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(normalizedAddress)}&size=${size}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  // Fallback to initials if there's an error
  if (imageError) {
    return (
      <div
        className={`rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center ${className || ''}`}
        style={{ width: size, height: size }}
      >
        <span className="text-white font-semibold text-sm">
          {normalizedAddress.slice(0, 2).toUpperCase()}
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
        alt={`${address} avatar`}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
        onLoad={() => setImageError(false)}
      />
    </div>
  );
}