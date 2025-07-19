"use client";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import Navbar from "@/components/core-ui/navbar";

const fadeUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function App() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen max-w-5xl mx-auto flex flex-col items-center justify-center px-4 md:px-6 lg:px-8 pt-32 pb-12 gap-16">
        <div className="text-center flex flex-col gap-6 max-w-2xl mx-auto">
          <div className="text-center flex flex-col gap-2">
            <motion.div
              className="flex justify-center mb-4"
              variants={fadeUpVariants}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.5 }}
            ></motion.div>
            <motion.h1
              className={`text-4xl md:text-5xl font-medium tracking-tight text-white`}
              variants={fadeUpVariants}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Introducing QuackQuery
            </motion.h1>

            <motion.p
              className="text-white/80 text-lg max-w-md mx-auto"
              variants={fadeUpVariants}
              initial="initial"
              animate="animate"
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Your AI co-pilot that stays in your desktop and sees what you see
              and hears what you hear.
            </motion.p>
          </div>

          <motion.div
            className="flex gap-2 items-center justify-center"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link href="/pricing">
              <Button
                size="lg"
                className="bg-white text-purple-600 hover:bg-white/90 gap-2"
              >
                <Download className="w-4 h-4" />
                Get QuackQuery
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Demo Video Section */}
        {/* <motion.div
          className="relative"
          variants={fadeUpVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="border-2 border-white/20 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto"
              src="/clippa.mp4"
            />
          </div>
        </motion.div> */}

        <footer className="text-sm text-white/70 flex items-center gap-2">
          <p>© 2025 QuackQuery. All rights reserved to </p>
          <Link
            href="https://x.com/Brainfdev"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-white transition-colors"
          >
            @Brainfdev
          </Link>
          <span>•</span>
          <Link
            href="/terms"
            className="underline hover:text-white transition-colors"
          >
            Terms & Conditions
          </Link>
          <span>•</span>
          <Link
            href="/privacy"
            className="underline hover:text-white transition-colors"
          >
            Privacy Policy
          </Link>
        </footer>
      </main>
    </>
  );
}
