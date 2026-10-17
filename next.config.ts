import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The board grew at /coins before it took over /; links from that time still land.
  async redirects() {
    return [{ source: "/coins", destination: "/", permanent: false }];
  },
};

export default nextConfig;
