import React from 'react';

interface AvatarProps {
  text: string;
  size?: "sm" | "md" | "lg";
}

export default function Avatar({ text, size = "md" }: AvatarProps) {
  const sizes = {
    sm: "w-10 h-10 text-sm",
    md: "w-12 h-12 text-base",
    lg: "w-24 h-24 text-2xl"
  };
  
  return (
    <div className={`${sizes[size]} rounded-full bg-blue-600 text-white flex items-center justify-center font-bold`}>
      {text}
    </div>
  );
}