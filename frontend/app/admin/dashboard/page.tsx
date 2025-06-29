"use client";
import { motion } from "motion/react";
import Navbar from "@/components/core-ui/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Download, Settings, BarChart3, Shield, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const fadeUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

interface AdminStats {
  totalUsers: number;
  totalSignedInUsers: number;
  totalPurchasedUsers: number;
  totalSudoUsers: number;
  totalAdminUsers: number;
  planCounts: { free: number; pro: number; enterprise: number };
  totalRevenue: number;
  downloadStats: {
    totalDownloads: number;
    dailyDownloads: { [date: string]: number };
    planDistribution: { free: number; pro: number; enterprise: number };
  };
  dailySignups: { [date: string]: number };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string;
    plan: string;
    createdAt: string;
    lastLogin?: string;
    lifetimeAccess: boolean;
    purchaseDate?: string;
    isAdmin: boolean;
    isSudo: boolean;
  }>;
  recentPurchases: Array<{
    id: string;
    email: string;
    name: string;
    plan: string;
    purchaseDate: string;
    paymentId: string;
  }>;
  sudoUsers: Array<{
    id: string;
    email: string;
    name: string;
    createdAt: string;
    lastLogin?: string;
    isAdmin: boolean;
  }>;
}

interface AdminSettings {
  maintenance: boolean;
  downloadEnabled: boolean;
  maxFreeDownloads: number;
  announcements: string[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'settings'>('stats');
  const { data: session } = authClient.useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      checkAdminAccess();
    } else {
      router.push('/login');
    }
  }, [session, router]);

  const checkAdminAccess = async () => {
    try {
      // Check user info to see if they're admin/sudo
      const response = await fetch('/api/user/info');
      if (!response.ok) {
        router.push('/login');
        return;
      }

      const userInfo = await response.json();
      if (!userInfo.isAdmin && !userInfo.isSudo) {
        router.push('/');
        return;
      }

      // If admin/sudo, fetch admin data
      fetchAdminData();
    } catch (error) {
      console.error('Admin access check failed:', error);
      router.push('/login');
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch real data from the admin stats API
      const statsResponse = await fetch('/api/admin/stats');
      
      if (statsResponse.ok) {
        const realStats = await statsResponse.json();
        setStats(realStats);
      } else {
        console.error('Failed to fetch admin stats:', statsResponse.statusText);
        // Fallback to empty data if API fails
        setStats({
          totalUsers: 0,
          totalSignedInUsers: 0,
          totalPurchasedUsers: 0,
          totalSudoUsers: 0,
          totalAdminUsers: 0,
          planCounts: { free: 0, pro: 0, enterprise: 0 },
          totalRevenue: 0,
          downloadStats: {
            totalDownloads: 0,
            dailyDownloads: {},
            planDistribution: { free: 0, pro: 0, enterprise: 0 }
          },
          dailySignups: {},
          recentUsers: [],
          recentPurchases: [],
          sudoUsers: []
        });
      }

      // Fetch real settings
      const settingsResponse = await fetch('/api/admin/settings');
      if (settingsResponse.ok) {
        const realSettings = await settingsResponse.json();
        setSettings(realSettings);
      } else {
        console.error('Failed to fetch admin settings:', settingsResponse.statusText);
        // Fallback settings
        setSettings({
          maintenance: false,
          downloadEnabled: true,
          maxFreeDownloads: 3,
          announcements: ['System running on real database!']
        });
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      // Set empty stats on error
      setStats({
        totalUsers: 0,
        totalSignedInUsers: 0,
        totalPurchasedUsers: 0,
        totalSudoUsers: 0,
        totalAdminUsers: 0,
        planCounts: { free: 0, pro: 0, enterprise: 0 },
        totalRevenue: 0,
        downloadStats: {
          totalDownloads: 0,
          dailyDownloads: {},
          planDistribution: { free: 0, pro: 0, enterprise: 0 }
        },
        dailySignups: {},
        recentUsers: [],
        recentPurchases: [],
        sudoUsers: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<AdminSettings>) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings)
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.settings);
      } else {
        console.error('Failed to update settings:', response.statusText);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-32 pb-12">
          <div className="text-center text-white">Loading admin dashboard...</div>
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
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-white mb-4">
            Admin Dashboard
          </h1>
          <p className="text-white/80 text-lg">
            Manage QuackQuery users, downloads, and system settings
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
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 border border-white/20">
            {[
              { id: 'stats', label: 'Statistics', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-md transition-all ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Statistics Tab */}
        {activeTab === 'stats' && stats && (
          <motion.div
            className="space-y-6"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">{stats.totalUsers}</h3>
                <p className="text-white/70">Total Users</p>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">{stats.totalSignedInUsers}</h3>
                <p className="text-white/70">Signed In Users</p>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Download className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">{stats.totalPurchasedUsers}</h3>
                <p className="text-white/70">Purchased Users</p>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Shield className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">{stats.totalSudoUsers}</h3>
                <p className="text-white/70">Sudo Users</p>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <BarChart3 className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">${stats.totalRevenue.toFixed(2)}</h3>
                <p className="text-white/70">Total Revenue</p>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Download className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">{stats.downloadStats.totalDownloads}</h3>
                <p className="text-white/70">Total Downloads</p>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <BarChart3 className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">
                  {Math.round((stats.totalPurchasedUsers / stats.totalUsers) * 100)}%
                </h3>
                <p className="text-white/70">Conversion Rate</p>
              </Card>
            </div>

            {/* Plan Distribution */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Plan Distribution</h3>
              <div className="space-y-3">
                {Object.entries(stats.planCounts).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <span className="text-white capitalize">{plan}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-white/20 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            plan === 'free' ? 'bg-gray-400' :
                            plan === 'pro' ? 'bg-purple-400' : 'bg-pink-400'
                          }`}
                          style={{ width: `${(count / stats.totalUsers) * 100}%` }}
                        />
                      </div>
                      <span className="text-white/70 text-sm w-8">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Users */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Users</h3>
              <div className="space-y-3">
                {stats.recentUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b border-white/10">
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        {user.name}
                        {user.isSudo && <Shield className="w-4 h-4 text-yellow-400" />}
                        {user.isAdmin && <Settings className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="text-white/60 text-sm">{user.email}</div>
                      {user.lifetimeAccess && (
                        <div className="text-green-400 text-xs">Lifetime Access</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`text-sm px-2 py-1 rounded ${
                        user.plan === 'free' ? 'bg-gray-500/20 text-gray-300' :
                        user.plan === 'pro' ? 'bg-purple-500/20 text-purple-300' :
                        'bg-pink-500/20 text-pink-300'
                      }`}>
                        {user.plan}
                      </div>
                      <div className="text-white/60 text-xs mt-1">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent Purchases */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Purchases</h3>
              <div className="space-y-3">
                {stats.recentPurchases.map(purchase => (
                  <div key={purchase.id} className="flex items-center justify-between py-2 border-b border-white/10">
                    <div>
                      <div className="text-white font-medium">{purchase.name}</div>
                      <div className="text-white/60 text-sm">{purchase.email}</div>
                      <div className="text-purple-400 text-xs">Payment ID: {purchase.paymentId}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 text-sm font-medium">$5.20</div>
                      <div className="text-white/60 text-xs">
                        {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Sudo Users List */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-400" />
                Sudo Users
              </h3>
              <div className="space-y-3">
                {stats.sudoUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between py-2 border-b border-white/10">
                    <div>
                      <div className="text-white font-medium flex items-center gap-2">
                        {user.name}
                        {user.isAdmin && <Settings className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="text-white/60 text-sm">{user.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-yellow-400 text-sm font-medium">
                        {user.isAdmin ? 'Admin' : 'Sudo'}
                      </div>
                      <div className="text-white/60 text-xs">
                        Last login: {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : 'Never'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            className="space-y-6"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">User Management</h3>
              <p className="text-white/70">User management features would be implemented here.</p>
            </Card>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settings && (
          <motion.div
            className="space-y-6"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">System Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Maintenance Mode</div>
                    <div className="text-white/60 text-sm">Temporarily disable the service</div>
                  </div>
                  <Button
                    variant={settings.maintenance ? "destructive" : "outline"}
                    onClick={() => updateSettings({ maintenance: !settings.maintenance })}
                  >
                    {settings.maintenance ? 'Disable' : 'Enable'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Download Enabled</div>
                    <div className="text-white/60 text-sm">Allow users to download the app</div>
                  </div>
                  <Button
                    variant={settings.downloadEnabled ? "outline" : "destructive"}
                    onClick={() => updateSettings({ downloadEnabled: !settings.downloadEnabled })}
                  >
                    {settings.downloadEnabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </main>
    </>
  );
} 