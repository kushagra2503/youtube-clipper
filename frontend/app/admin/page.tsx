"use client";
import { motion } from "motion/react";
import Navbar from "@/components/core-ui/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Download, Settings, BarChart3, Shield, Mail, UserPlus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
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

interface SudoUser {
  id: string;
  email: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [sudoUsers, setSudoUsers] = useState<SudoUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'sudo' | 'settings'>('stats');
  const [newSudoEmail, setNewSudoEmail] = useState('');
  const [isAddingSudo, setIsAddingSudo] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isPending) {
      checkAdminAccess();
    }
  }, [session, isPending]);

  useEffect(() => {
    if (session && isAdminUser()) {
      fetchAdminData();
      fetchSudoUsers();
    }
  }, [session]);

  const isAdminUser = () => {
    return session?.user?.email === 'radhikayash2@gmail.com' || 
           session?.user?.role === 'admin';
  };

  const checkAdminAccess = async () => {
    try {
      if (!session) {
        router.push('/login');
        return;
      }

      if (!isAdminUser()) {
        router.push('/');
        return;
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Admin access check failed:', error);
      router.push('/login');
    }
  };

  const fetchAdminData = async () => {
    try {
      // Fetch real admin stats from the API
      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const realStats = await statsResponse.json();
        setStats(realStats);
      } else {
        console.error('Failed to fetch admin stats:', statsResponse.statusText);
      setStats(null);
      }

      // Fetch real settings from the API
      const settingsResponse = await fetch('/api/admin/settings');
      if (settingsResponse.ok) {
        const realSettings = await settingsResponse.json();
        setSettings(realSettings);
      } else {
        console.error('Failed to fetch admin settings:', settingsResponse.statusText);
      setSettings(null);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      setStats(null);
      setSettings(null);
    }
  };

  const updateSettings = async (newSettings: Partial<AdminSettings>) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (response.ok) {
        const result = await response.json();
        setSettings(result.settings || newSettings);
        alert('Settings updated successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to update settings: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      alert('Failed to update settings: Network error');
    }
  };

  const fetchSudoUsers = async () => {
    try {
      const response = await fetch('/api/admin/sudo-users');
      if (response.ok) {
        const data = await response.json();
        setSudoUsers(data.sudoUsers || []);
      } else {
        console.error('Failed to fetch sudo users:', response.statusText);
      setSudoUsers([]);
      }
    } catch (error) {
      console.error('Failed to fetch sudo users:', error);
      setSudoUsers([]);
    }
  };

  const addSudoUser = async () => {
    if (!newSudoEmail.trim()) return;

    try {
      setIsAddingSudo(true);
      
      const response = await fetch('/api/admin/sudo-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newSudoEmail.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
      setNewSudoEmail('');
        await fetchSudoUsers(); // Refresh the list
        alert(`Successfully added ${data.sudoUser.email} as sudo user!`);
      } else {
        alert(`Failed to add sudo user: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to add sudo user:', error);
      alert('Failed to add sudo user: Network error');
    } finally {
      setIsAddingSudo(false);
    }
  };

  const removeSudoUser = async (email: string) => {
    if (!confirm(`Remove sudo access for ${email}?`)) return;

    try {
      const response = await fetch('/api/admin/sudo-users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchSudoUsers(); // Refresh the list
        alert(`Successfully removed ${email} from sudo users!`);
      } else {
        alert(`Failed to remove sudo user: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to remove sudo user:', error);
      alert('Failed to remove sudo user: Network error');
    }
  };

  // Show loading during SSR or while checking auth
  if (!isClient || isLoading || isPending) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-32 pb-12">
          <div className="text-center text-white">Loading admin dashboard...</div>
        </main>
      </>
    );
  }

  // Show access denied if not admin (only after client hydration)
  if (isClient && !isPending && (!session || !isAdminUser())) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen max-w-6xl mx-auto px-4 md:px-6 lg:px-8 pt-32 pb-12">
          <div className="text-center text-white">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-white/70">You need admin privileges to access this page.</p>
          </div>
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
              { id: 'sudo', label: 'Sudo Users', icon: Shield },
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
        {activeTab === 'stats' && (
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
                <div className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</div>
                <div className="text-white/60 text-sm">Total Users</div>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats?.totalSignedInUsers || 0}</div>
                <div className="text-white/60 text-sm">Signed In Users</div>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Download className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats?.totalPurchasedUsers || 0}</div>
                <div className="text-white/60 text-sm">Purchased Users</div>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <BarChart3 className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">${stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
                <div className="text-white/60 text-sm">Total Revenue</div>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Shield className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats?.totalSudoUsers || 0}</div>
                <div className="text-white/60 text-sm">Sudo Users</div>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Settings className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats?.totalAdminUsers || 0}</div>
                <div className="text-white/60 text-sm">Admin Users</div>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Download className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats?.downloadStats?.totalDownloads || 0}</div>
                <div className="text-white/60 text-sm">Total Downloads</div>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <BarChart3 className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">
                  {stats?.totalUsers ? Math.round((stats.totalPurchasedUsers / stats.totalUsers) * 100) + '%' : '0%'}
                </div>
                <div className="text-white/60 text-sm">Conversion Rate</div>
              </Card>
            </div>

            {/* Plan Distribution */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Plan Distribution</h3>
              {stats ? (
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
                            style={{ width: `${stats.totalUsers > 0 ? (count / stats.totalUsers) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-white/70 text-sm w-8">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/60">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No data available</p>
                  <p className="text-sm">Statistics will appear when users sign up</p>
                </div>
              )}
            </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Users</h3>
                {stats && stats.recentUsers && stats.recentUsers.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {stats.recentUsers.slice(0, 5).map(user => (
                    <div key={user.id} className="flex items-center justify-between py-2 border-b border-white/10">
                      <div>
                          <div className="text-white font-medium flex items-center gap-2">
                            {user.name || user.email.split('@')[0]}
                            {user.isSudo && <Shield className="w-3 h-3 text-yellow-400" />}
                            {user.isAdmin && <Settings className="w-3 h-3 text-red-400" />}
                          </div>
                        <div className="text-white/60 text-sm">{user.email}</div>
                      </div>
                      <div className="text-right">
                          <div className={`text-xs px-2 py-1 rounded ${
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
              ) : (
                <div className="text-center py-8 text-white/60">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No users yet</p>
                    <p className="text-sm">Users will appear here when they sign up</p>
                  </div>
                )}
              </Card>

              {/* Recent Purchases */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Recent Purchases</h3>
                {stats && stats.recentPurchases && stats.recentPurchases.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {stats.recentPurchases.slice(0, 5).map(purchase => (
                      <div key={purchase.id} className="flex items-center justify-between py-2 border-b border-white/10">
                        <div>
                          <div className="text-white font-medium">{purchase.name || purchase.email.split('@')[0]}</div>
                          <div className="text-white/60 text-sm">{purchase.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 text-sm font-medium">$4.20</div>
                          <div className="text-white/60 text-xs">
                            {new Date(purchase.purchaseDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/60">
                    <Download className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No purchases yet</p>
                    <p className="text-sm">Purchases will appear here when users buy the app</p>
                </div>
              )}
            </Card>
            </div>
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
            {/* User Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</h3>
                <p className="text-white/70">Total Users</p>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">{stats?.totalSignedInUsers || 0}</h3>
                <p className="text-white/70">Signed In Users</p>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Download className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">{stats?.totalPurchasedUsers || 0}</h3>
                <p className="text-white/70">Purchased Users</p>
              </Card>
              
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6 text-center">
                <Shield className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-white">{stats?.totalSudoUsers || 0}</h3>
                <p className="text-white/70">Sudo Users</p>
              </Card>
            </div>

            {/* All Users List */}
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Users ({stats?.recentUsers?.length || 0})
              </h3>
              
              {stats?.recentUsers && stats.recentUsers.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stats.recentUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <div className="text-white font-medium flex items-center gap-2">
                            {user.name || user.email.split('@')[0]}
                            {user.isSudo && <Shield className="w-4 h-4 text-yellow-400" title="Sudo User" />}
                            {user.isAdmin && <Settings className="w-4 h-4 text-red-400" title="Admin User" />}
                          </div>
                          <div className="text-white/60 text-sm">{user.email}</div>
                          <div className="flex items-center gap-4 text-xs text-white/50 mt-1">
                            <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                            {user.purchaseDate && (
                              <span className="text-green-400">Purchased: {new Date(user.purchaseDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm px-3 py-1 rounded-full ${
                          user.plan === 'free' ? 'bg-gray-500/20 text-gray-300' :
                          user.plan === 'pro' ? 'bg-purple-500/20 text-purple-300' :
                          'bg-pink-500/20 text-pink-300'
                        }`}>
                          {user.plan}
                        </div>
                        {user.lifetimeAccess && (
                          <div className="text-green-400 text-xs mt-1">✓ Lifetime Access</div>
                        )}
                        <div className="text-white/60 text-xs mt-1">
                          Status: {user.isSudo ? 'Sudo' : user.isAdmin ? 'Admin' : 'Regular'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-white/60">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No users found</p>
                  <p className="text-sm">Users will appear here once they sign up</p>
                </div>
              )}
            </Card>

            {/* Recent Purchases */}
            {stats?.recentPurchases && stats.recentPurchases.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5 text-green-400" />
                  Recent Purchases ({stats.recentPurchases.length})
                </h3>
                <div className="space-y-3">
                  {stats.recentPurchases.map(purchase => (
                    <div key={purchase.id} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div>
                        <div className="text-white font-medium">{purchase.name || purchase.email.split('@')[0]}</div>
                        <div className="text-white/60 text-sm">{purchase.email}</div>
                        <div className="text-green-400 text-xs">Payment ID: {purchase.paymentId}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 text-lg font-bold">$4.20</div>
                        <div className="text-white/60 text-xs">
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* Sudo Users Tab */}
        {activeTab === 'sudo' && (
          <motion.div
            className="space-y-6"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Sudo Users Management
              </h3>
              <p className="text-white/70 mb-6">
                Manage users who can download QuackQuery directly without payment.
              </p>

              {/* Add New Sudo User */}
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <h4 className="text-lg font-medium text-white mb-3">Add New Sudo User</h4>
                <div className="flex gap-3">
                  <Input
                    type="email"
                    placeholder="Enter email address..."
                    value={newSudoEmail}
                    onChange={(e) => setNewSudoEmail(e.target.value)}
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    onKeyPress={(e) => e.key === 'Enter' && addSudoUser()}
                  />
                  <Button
                    onClick={addSudoUser}
                    disabled={isAddingSudo || !newSudoEmail.trim()}
                    className="bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-500 hover:to-pink-500 text-white gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    {isAddingSudo ? 'Adding...' : 'Add Sudo User'}
                  </Button>
                </div>
              </div>

              {/* Current Sudo Users */}
              <div>
                <h4 className="text-lg font-medium text-white mb-3">
                  Current Sudo Users ({sudoUsers.length})
                </h4>
                {sudoUsers.length === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No sudo users found</p>
                    <p className="text-sm">Add users above to grant them direct download access</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sudoUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <Shield className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{user.email}</div>
                            <div className="text-white/60 text-sm">
                              Added: {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeSudoUser(user.email)}
                          className="border-red-400/50 text-red-400 hover:bg-red-400/10 gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-blue-300 font-medium mb-1">How it works:</h5>
                    <ul className="text-blue-200/80 text-sm space-y-1">
                      <li>• Users with sudo access can download QuackQuery without payment</li>
                      <li>• They bypass the pricing page and get direct download links</li>
                      <li>• Sudo users don't need Pro/Enterprise subscriptions</li>
                      <li>• This is useful for team members, testers, or special users</li>
                    </ul>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <motion.div
            className="space-y-6"
            variants={fadeUpVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">System Settings</h3>
              {settings ? (
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
              ) : (
                <div className="text-center py-8 text-white/60">
                  <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Settings not available</p>
                  <p className="text-sm">Connect backend to manage system settings</p>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </main>
    </>
  );
} 