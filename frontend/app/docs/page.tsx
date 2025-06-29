"use client";
import { motion } from "motion/react";
import Navbar from "@/components/core-ui/navbar";
import { MonitorPlay, Headphones, Brain, Download, Settings, Shield, Zap } from "lucide-react";

const fadeUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen max-w-4xl mx-auto px-4 md:px-6 lg:px-8 pt-32 pb-12">
        <motion.div
          className="text-center mb-12"
          variants={fadeUpVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white mb-4">
            QuackQuery Documentation
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Learn how to use QuackQuery to ace your interviews with AI-powered assistance
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* Getting Started */}
          <motion.section
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Download className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-semibold text-white">Getting Started</h2>
            </div>
            <div className="space-y-4 text-white/80">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">1. Download & Install</h3>
                <p>Download the QuackQuery Electron app for your operating system. Available for Windows, macOS, and Linux.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">2. Grant Permissions</h3>
                <p>Allow QuackQuery to access your screen and microphone. These permissions are essential for the AI to assist you effectively.</p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">3. Start Your Interview</h3>
                <p>Launch QuackQuery before your interview call. The AI will automatically start monitoring and providing assistance.</p>
              </div>
            </div>
          </motion.section>

          {/* Features */}
          <motion.section
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Zap className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-semibold text-white">Key Features</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <MonitorPlay className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-medium text-white">Screen Reading</h3>
                </div>
                <p className="text-white/70 text-sm">
                  Analyzes interview questions, coding challenges, and shared documents in real-time
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Headphones className="w-5 h-5 text-pink-400" />
                  <h3 className="text-lg font-medium text-white">Audio Processing</h3>
                </div>
                <p className="text-white/70 text-sm">
                  Listens to interview conversations and provides contextual responses
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-medium text-white">AI Assistance</h3>
                </div>
                <p className="text-white/70 text-sm">
                  Generates intelligent answers, code solutions, and professional responses
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-medium text-white">Privacy First</h3>
                </div>
                <p className="text-white/70 text-sm">
                  All processing happens locally. Your data never leaves your device
                </p>
              </div>
            </div>
          </motion.section>

          {/* How to Use */}
          <motion.section
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-6 h-6 text-white" />
              <h2 className="text-2xl font-semibold text-white">How to Use</h2>
            </div>
            <div className="space-y-6 text-white/80">
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Technical Interviews</h3>
                <ul className="space-y-2 text-sm">
                  <li>• QuackQuery will read coding questions from your screen</li>
                  <li>• Get algorithm explanations and code snippets instantly</li>
                  <li>• Receive hints for optimization and best practices</li>
                  <li>• Access relevant documentation and examples</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-3">Behavioral Interviews</h3>
                <ul className="space-y-2 text-sm">
                  <li>• AI listens to questions and suggests STAR method responses</li>
                  <li>• Get help structuring your answers professionally</li>
                  <li>• Receive prompts for relevant experience examples</li>
                  <li>• Practice responses with confidence</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-3">System Design</h3>
                <ul className="space-y-2 text-sm">
                  <li>• Visual analysis of architecture diagrams</li>
                  <li>• Suggestions for scalability and performance</li>
                  <li>• Database and infrastructure recommendations</li>
                  <li>• Trade-off analysis and best practices</li>
                </ul>
              </div>
            </div>
          </motion.section>

          {/* Best Practices */}
          <motion.section
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2 className="text-2xl font-semibold text-white mb-6">Best Practices</h2>
            <div className="space-y-4 text-white/80">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-white font-medium mb-2">⚡ Preparation</h3>
                <p className="text-sm">Test QuackQuery before your interview to ensure all permissions are working correctly.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-white font-medium mb-2">🎯 Positioning</h3>
                <p className="text-sm">Position your secondary monitor or phone where you can easily see AI suggestions without looking away from the camera.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-white font-medium mb-2">🤝 Ethics</h3>
                <p className="text-sm">Use QuackQuery as a confidence booster and learning aid. Always be honest about your skills and experience.</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h3 className="text-white font-medium mb-2">🔒 Privacy</h3>
                <p className="text-sm">All data processing happens locally. QuackQuery doesn't store or transmit your interview content.</p>
              </div>
            </div>
          </motion.section>

          {/* FAQ */}
          <motion.section
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h2 className="text-2xl font-semibold text-white mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-medium mb-2">Is QuackQuery detectable?</h3>
                <p className="text-white/70 text-sm">QuackQuery runs as a standard desktop application and doesn't inject into browser processes, making it undetectable by standard interview platforms.</p>
              </div>
              <div>
                <h3 className="text-white font-medium mb-2">What platforms does it support?</h3>
                <p className="text-white/70 text-sm">QuackQuery works with all major video calling platforms including Zoom, Google Meet, Microsoft Teams, and more.</p>
              </div>
              <div>
                <h3 className="text-white font-medium mb-2">How accurate are the AI responses?</h3>
                <p className="text-white/70 text-sm">QuackQuery uses advanced AI models trained on technical content, providing highly accurate and contextual responses for most interview scenarios.</p>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </>
  );
} 