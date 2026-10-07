import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["localhost", "192.168.0.242"],
};

export default nextConfig;
