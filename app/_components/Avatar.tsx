"use client";

import React, { useState } from "react";
import Image from "next/image";

interface AvatarProps {
  text: string;
  size?: "sm" | "md" | "lg";
  imageUrl?: string | null;
}

const sizePx = { sm: 40, md: 48, lg: 96 };

const ALLOWED_IMAGE_HOSTS = [
  "lh3.googleusercontent.com",
  "lh4.googleusercontent.com",
  "lh5.googleusercontent.com",
  "lh6.googleusercontent.com",
  "example.com",
];

function isAllowedImageHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return ALLOWED_IMAGE_HOSTS.some(
      (allowed) => host === allowed || host.endsWith("." + allowed)
    );
  } catch {
    return false;
  }
}

export default function Avatar({ text, size = "md", imageUrl }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const sizes = {
    sm: "w-10 h-10 text-sm",
    md: "w-12 h-12 text-base",
    lg: "w-24 h-24 text-2xl",
  };
  const px = sizePx[size];

  const showImage =
    imageUrl &&
    !imageFailed &&
    isAllowedImageHost(imageUrl);

  if (showImage) {
    return (
      <Image
        src={imageUrl}
        alt=""
        width={px}
        height={px}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0`}
    >
      {text}
    </div>
  );
}