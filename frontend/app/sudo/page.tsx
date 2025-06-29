"use client";
import { motion } from "motion/react";
import Navbar from "@/components/core-ui/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Terminal, 
  Send, 
  AlertTriangle, 
  Activity, 
  Database, 
  Server 
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const fadeUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARN';
  message: string;
  userId?: string;
  platform?: string;
  error?: string;
}

export default function SudoDashboard() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'broadcast' | 'system'>('logs');
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [targetPlan, setTargetPlan] = useState<'all' | 'free' | 'pro' | 'enterprise'>('all');
  const [sending, setSending] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkSudoAccess();
    fetchLogs();
  }, []);

  const checkSudoAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        router.push('/login');
        return;
      }

      const user = await response.json();
      if (!user.isSudo && !user.isAdmin) {
        router.push('/');
        return;
      }
    } catch (error) {
      console.error('Sudo access check failed:', error);
      router.push('/login');
    }
  };

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sudo/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendBroadcast = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) return;

    try {
      setSending(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/sudo/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: broadcastSubject,
          message: broadcastMessage,
          targetPlan: targetPlan === 'all' ? undefined : targetPlan
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Broadcast sent to ${data.recipientCount} users!`);
        setBroadcastSubject('');
        setBroadcastMessage('');
        setTargetPlan('all');
      } else {
        alert('Failed to send broadcast');
      }
    } catch (error) {
      console.error('Broadcast error:', error);
      alert('Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-32 pb-12">
          <div className="text-center text-white">Loading sudo dashboard...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-32 pb-12">
        <motion.div
          className="text-center mb-8"
          variants={fadeUpVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Terminal className="w-8 h-8 text-red-400" />
            <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white">
              Sudo Dashboard
            </h1>
          </div>
          <p className="text-white/80 text-lg">
            Super administrator access - handle with care
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          className="flex justify-center mb-8"
          variants={fadeUpVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="bg-red-500/10 backdrop-blur-sm rounded-lg p-1 border border-red-500/20">
            {[
              { id: 'logs', label: 'System Logs', icon: Activity },
              { id: 'broadcast', label: 'Broadcast', icon: Send },
              { id: 'system', label: 'System Info', icon: Server }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-red-500/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-red-500/10'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* System Logs Tab */}
        {activeTab === 'logs' && (
          <motion.div
            className="space-y-6"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">System Logs</h3>
                <Button
                  onClick={fetchLogs}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Refresh
                </Button>
              </div>
              <div className="bg-black/50 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-white/60">No logs available</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="mb-2">
                      <span className="text-white/40">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span
                        className={`ml-2 px-2 py-1 rounded text-xs ${
                          log.level === 'ERROR' ? 'bg-red-500/20 text-red-300' :
                          log.level === 'WARN' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}
                      >
                        {log.level}
                      </span>
                      <span className="ml-2 text-white">{log.message}</span>
                      {log.error && (
                        <div className="text-red-300 text-xs ml-4 mt-1">
                          Error: {log.error}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Broadcast Tab */}
        {activeTab === 'broadcast' && (
          <motion.div
            className="space-y-6"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <h3 className="text-xl font-semibold text-white">Broadcast Message</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Target Audience
                  </label>
                  <select
                    value={targetPlan}
                    onChange={(e) => setTargetPlan(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    <option value="all">All Users</option>
                    <option value="free">Free Users</option>
                    <option value="pro">Pro Users</option>
                    <option value="enterprise">Enterprise Users</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Subject
                  </label>
                  <Input
                    value={broadcastSubject}
                    onChange={(e) => setBroadcastSubject(e.target.value)}
                    placeholder="Important announcement about QuackQuery"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Message (HTML supported)
                  </label>
                  <textarea
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Dear QuackQuery users,..."
                    rows={8}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white resize-y"
                  />
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-300 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Warning</span>
                  </div>
                  <p className="text-yellow-200 text-sm">
                    This will send an email to all users in the selected plan. 
                    Make sure your message is appropriate and necessary.
                  </p>
                </div>

                <Button
                  onClick={sendBroadcast}
                  disabled={!broadcastSubject.trim() || !broadcastMessage.trim() || sending}
                  className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                >
                  {sending ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Broadcast
                    </>
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* System Info Tab */}
        {activeTab === 'system' && (
          <motion.div
            className="space-y-6"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Server className="w-4 h-4" />
                    Server Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Environment:</span>
                      <span className="text-white">
                        {process.env.NODE_ENV === 'production' ? 'Production' : 'Development'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Backend Status:</span>
                      <span className="text-green-400">Online</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Database:</span>
                      <span className="text-green-400">Connected</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    Data Storage
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">User Data:</span>
                      <span className="text-white">In-Memory</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Sessions:</span>
                      <span className="text-white">JWT Tokens</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Downloads:</span>
                      <span className="text-white">CDN Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-red-500/10 backdrop-blur-sm border-red-500/20 p-6">
              <h3 className="text-xl font-semibold text-red-300 mb-4">Production Notes</h3>
              <div className="space-y-2 text-sm text-red-200">
                <p>• This demo uses in-memory storage - data will be lost on server restart</p>
                <p>• For production, implement proper database persistence</p>
                <p>• Set up proper email configuration for user notifications</p>
                <p>• Configure Stripe webhooks for payment processing</p>
                <p>• Implement proper logging and monitoring</p>
              </div>
            </Card>
          </motion.div>
        )}
      </main>
    </>
  );
} 