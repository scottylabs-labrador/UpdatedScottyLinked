import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com", pathname: "/**" },
      { hostname: "lh4.googleusercontent.com", pathname: "/**" },
      { hostname: "lh5.googleusercontent.com", pathname: "/**" },
      { hostname: "lh6.googleusercontent.com", pathname: "/**" },
      { hostname: "example.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
