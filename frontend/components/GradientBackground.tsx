"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

export const GradientBackground = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render a static version during SSR, animated version on client
  if (!isClient) {
    return (
      <div className="fixed inset-0 -z-[10] bg-gradient-to-b from-black via-gray-900 to-gray-800" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 -z-[10] bg-gradient-to-b from-black via-gray-900 to-gray-800"
    />
  );
};
