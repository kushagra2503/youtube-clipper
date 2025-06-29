"use client";
import { authClient } from "@/lib/auth-client"; // import the auth client
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  LogOut,
  Monitor,
  Smartphone,
  Square,
  ArrowDown,
  Settings,
  Crown,
  Shield,
} from "lucide-react";
import Image from "next/image";
import Buy from "@/components/buy";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";

export default function Editor() {
  const [url, setUrl] = useState("");
  const [startTime, setStartTime] = useState("00:00:00");
  const [endTime, setEndTime] = useState("00:00:00");
  const [addSubs, setAddSubs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isSudoUser, setIsSudoUser] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<{
    title?: string;
    description?: string;
    thumbnail?: string;
    duration?: string;
  }>({});
  const [cropRatio, setCropRatio] = useState<
    "original" | "vertical" | "square"
  >("original");
  const [formats, setFormats] = useState<{format_id: string, label: string}[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const { data: session } = authClient.useSession();
  const [downloadCount, setDownloadCount] = useState(0);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAdminWelcome, setShowAdminWelcome] = useState(false);
  const [showSudoWelcome, setShowSudoWelcome] = useState(false);
  const router = useRouter();
  const getVideoId = (url: string) => {
    // YouTube regex
    const youtubeRegExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const youtubeMatch = url.match(youtubeRegExp);
    if (youtubeMatch && youtubeMatch[7].length === 11) {
      return youtubeMatch[7];
    }
    
    // Instagram regex for reels and posts
    const instagramRegExp = /instagram\.com\/(reel|p)\/([^\/\?]+)/;
    const instagramMatch = url.match(instagramRegExp);
    if (instagramMatch) {
      return instagramMatch[2]; // Return the reel/post ID
    }
    
    return null;
  };

  const fetchVideoMetadata = async (videoId: string | null) => {
    if (!videoId) return;
    setIsMetadataLoading(true);

    try {
      // Use the original URL for metadata fetching instead of constructing YouTube URL
      const metadataResponse = await fetch(
        `/api/metadata?url=${encodeURIComponent(url)}`
      );
      if (!metadataResponse.ok) throw new Error("Failed to fetch video metadata");
      const metadata = await metadataResponse.json();

      setMetadata({
        title: metadata.title,
        description: metadata.description,
        thumbnail: metadata.thumbnail,
      });
      
      // Set thumbnail based on platform
      if (url.includes('instagram.com')) {
        setThumbnailUrl(metadata.image || null);
      } else {
        // YouTube fallback
        setThumbnailUrl(
          metadata.image
            ? metadata.image
            : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        );
      }

      // Fetch formats
      const formatsResponse = await fetch(`/api/formats?url=${encodeURIComponent(url)}`);
      if(formatsResponse.ok) {
        const formatsData = await formatsResponse.json();
        setFormats(formatsData.formats || []);
        if (formatsData.formats?.length > 0) {
          setSelectedFormat(formatsData.formats[0].format_id);
        }
      }

    } catch (error) {
      console.error("Error fetching metadata:", error);
      // Platform-specific fallback
      if (url.includes('instagram.com')) {
        setThumbnailUrl(null);
      } else {
        // YouTube fallback
        setThumbnailUrl(
          `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        );
      }
    } finally {
      setIsMetadataLoading(false);
    }
  };

  useEffect(() => {
    const videoId = getVideoId(url);
    if (videoId) {
      // Show skeleton immediately by setting thumbnailUrl
      setThumbnailUrl("loading");
      setIsMetadataLoading(true);
      fetchVideoMetadata(videoId);
    } else {
      setThumbnailUrl(null);
      setMetadata({});
      setFormats([]);
      setSelectedFormat('');
      setIsMetadataLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (session?.user?.id) {
      const storedCount = localStorage.getItem(`bangers-${session.user.id}`);
      setDownloadCount(storedCount ? parseInt(storedCount) : 0);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        // Check premium status
        const premiumResponse = await fetch("/api/user/premium");
        const premiumData = await premiumResponse.json();
        setIsPremium(premiumData.isPremium);
        
        const wasSudoUser = isSudoUser;
        const newIsSudoUser = premiumData.isSudoUser || false;
        setIsSudoUser(newIsSudoUser);
        
        // Show welcome popup if user just became a sudo user (first time check)
        if (newIsSudoUser && !wasSudoUser) {
          setShowSudoWelcome(true);
        }
        
        // Only show premium modal if user is not premium and not a sudo user
        setShowPremiumModal(!premiumData.isPremium && !premiumData.isSudoUser);

        // Check admin status
        const adminResponse = await fetch("/api/admin/setup");
        if (adminResponse.ok) {
          const adminData = await adminResponse.json();
          const wasAdmin = isAdmin;
          const newIsAdmin = adminData.currentUserIsAdmin || false;
          setIsAdmin(newIsAdmin);
          
          // Show welcome popup if user just became admin (first time check)
          if (newIsAdmin && !wasAdmin) {
            setShowAdminWelcome(true);
          }
        }
      } catch (error) {
        console.error("Error checking user status:", error);
      }
    };

    if (session?.user) {
      checkUserStatus();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPremium && !isSudoUser) {
      setShowPremiumModal(true);
      return;
    }

    setLoading(true);

    try {
      // Step 1: kick-off processing
      const clipKickoff = await fetch("/api/clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, startTime, endTime, cropRatio, subtitles: addSubs, formatId: selectedFormat }),
      });

      if (!clipKickoff.ok) {
        const errJson = await clipKickoff.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to start processing");
      }

      const { id } = (await clipKickoff.json()) as { id: string };

      // Step 2: poll until ready
      type JobStatus = "processing" | "ready" | "error";
      interface JobStatusResponse { status: JobStatus; error?: string }

      let status: JobStatus = "processing";
      while (status === "processing") {
        await new Promise((r) => setTimeout(r, 3000)); // 3-second polling
        const pollRes = await fetch(`/api/clip/${id}`);
        if (!pollRes.ok) throw new Error("Failed to poll job status");
        const pollJson = (await pollRes.json()) as JobStatusResponse;
        status = pollJson.status;
        if (status === "error") throw new Error(pollJson.error || "Processing failed");
      }

      // Step 3: download the finished clip
      const downloadRes = await fetch(`/api/clip/${id}?download=1`);
      if (!downloadRes.ok) throw new Error("Failed to download clip");

      const blob = await downloadRes.blob();

      // Extract filename from content-disposition header if available, otherwise default
      const disposition = downloadRes.headers.get("content-disposition");
      let filename = "clip.mp4";
      if (disposition && disposition.indexOf("attachment") !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"])(.*?)\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[3]) {
          filename = matches[3];
        }
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();

      // Update download count
      const newCount = downloadCount + 1;
      if (session?.user?.id) {
        localStorage.setItem(`bangers-${session.user.id}`, String(newCount));
      }
      setDownloadCount(newCount);
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      // Add user-friendly error handling here
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authClient.signOut();
  };

  const resolutionOptions = {
    original: { icon: <Monitor className="w-4 h-4" />, label: "Original" },
    vertical: { icon: <Smartphone className="w-4 h-4" />, label: "Vertical" },
    square: { icon: <Square className="w-4 h-4" />, label: "Square" },
  } as const;

  return (
    <main className="flex flex-col w-full h-full min-h-screen p-4 gap-4 max-w-3xl mx-auto items-center justify-center">
      <nav className="flex flex-col w-full gap-4 fixed top-0 left-0 right-0 z-20">
        <div className="flex flex-col gap-6 p-4">
          <div className="flex justify-between items-start">
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.4 }}
              className="font-medium rounded-full border py-2 bg-card px-4 cursor-pointer hover:bg-card/50"
            >
              👋 Hey, {session?.user.name.split(" ")[0]}!
            </motion.button>
            <motion.span
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.4 }}
              className="flex gap-2"
            >
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => router.push('/admin')}
                  title="Admin Panel"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              )}
              <Button variant="destructive" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
              </Button>
            </motion.span>
          </div>
        </div>
      </nav>

      <section className="flex flex-col w-full gap-4 max-w-xl mx-auto transition-all duration-300">
        <AnimatePresence mode="wait">
          {!isMetadataLoading && thumbnailUrl === null ? (
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-2xl lg:text-3xl font-medium tracking-tight text-center mx-auto"
            >
              What do you wanna snip today😊?
            </motion.h1>
          ) : isMetadataLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-6 h-full w-fit mx-auto"
            >
              <div className="flex flex-col md:flex-row gap-4 bg-muted/50 p-2 rounded-lg items-center">
                <div className="w-20 h-[45px] bg-muted animate-pulse rounded-md" />
                <div className="flex flex-col gap-2">
                  <div className="h-6 w-48 bg-muted animate-pulse rounded-md" />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-6 h-full w-fit mx-auto"
            >
              <div className="flex flex-col md:flex-row gap-4 bg-muted/50 p-2 rounded-lg md:items-center">
                {thumbnailUrl && (
                  <Image
                    unoptimized
                    width={1280}
                    height={720}
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-20 object-cover aspect-video rounded-md"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.includes("maxresdefault")) {
                        target.src = target.src.replace(
                          "maxresdefault",
                          "hqdefault"
                        );
                      }
                    }}
                  />
                )}
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium text-lg line-clamp-1">
                    {metadata.title}
                  </h3>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-12 border p-4 bg-card rounded-3xl"
        >
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              id="url"
              placeholder="Paste YouTube or Instagram URL here..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="bg-transparent border-none outline-none w-full"
            />
            <Button type="submit" size="icon" disabled={loading}>
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <ArrowDown className="w-6 h-6" />
              )}
            </Button>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-3 w-full items-center">
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="startTime" className="sr-only">
                  Start Time
                </Label>
                <Input
                  type="text"
                  id="startTime"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                  placeholder="00:00:00"
                  required
                  className="font-mono text-sm"
                />
              </div>
              <span className="text-sm text-muted-foreground">to</span>
              <div className="flex flex-col gap-2 w-full">
                <Label htmlFor="endTime" className="sr-only">
                  End Time
                </Label>
                <Input
                  type="text"
                  id="endTime"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  pattern="[0-9]{2}:[0-9]{2}:[0-9]{2}"
                  placeholder="00:00:00"
                  required
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <Label htmlFor="cropRatio" className="sr-only">
                Crop Ratio
              </Label>
              <div className="flex items-center justify-between p-2 rounded-2xl border relative bg-white/5 backdrop-blur-md">
                {Object.entries(resolutionOptions).map(
                  ([key, { icon, label }]) => (
                    <div
                      key={key}
                      onClick={() => setCropRatio(key as typeof cropRatio)}
                      className="relative cursor-pointer w-full group text-center py-1.5 overflow-visible hover:scale-105 transition-all duration-300 ease-[cubic-bezier(0.175, 0.885, 0.32, 1.275)] px-4"
                    >
                      {cropRatio === key && (
                        <motion.div
                          layoutId="hover"
                          className="absolute inset-0 bg-primary rounded-md"
                          transition={{
                            type: "spring",
                            stiffness: 120,
                            damping: 10,
                            mass: 0.2,
                            ease: [0, 1, 0.35, 0],
                          }}
                        />
                      )}
                      <span
                        className={`relative flex text-xs sm:text-sm items-center gap-2 justify-center ${
                          cropRatio === key
                            ? "text-primary-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {icon}
                        <span>{label}</span>
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <Label htmlFor="quality">Quality</Label>
                <select
                  id="quality"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="bg-transparent border rounded-md p-2 h-10 flex items-center appearance-none bg-no-repeat bg-right bg-[length:16px] pr-8"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 8px center'
                  }}
                  disabled={formats.length === 0}
                >
                  {formats.length === 0 ? (
                    <option value="">Loading formats...</option>
                  ) : (
                    formats.map((format) => (
                      <option key={format.format_id} value={format.format_id}>
                        {format.label}
                      </option>
                    ))  
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-2 flex-1">
                <Label htmlFor="subtitles-switch">Subtitles</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="subtitles-switch"
                    checked={addSubs}
                    onCheckedChange={setAddSubs}
                  />
                  <Label htmlFor="subtitles-switch" className="text-sm text-muted-foreground">
                    English only
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </motion.form>
        <AnimatePresence mode="wait">
          {downloadCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mt-4 text-sm text-muted-foreground"
            >
              🔥 {downloadCount} video{downloadCount > 1 && "s"} clipped
            </motion.div>
          )}
        </AnimatePresence>
      </section>
      {showPremiumModal && (
        <Buy
          isOpen={showPremiumModal}
          setIsOpen={setShowPremiumModal}
          product={{
            product_id: process.env.NEXT_PUBLIC_DODO_PAYMENTS_PRODUCT_ID!,
            name: "Starter",
            description: "Servers don't come cheap 🤷🏻",
            price: "2.20",
            currency: "$",
          }}
        />
      )}
      
      <Dialog open={showAdminWelcome} onOpenChange={setShowAdminWelcome}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              Welcome, Admin!
            </DialogTitle>
            <DialogDescription>
              You now have admin privileges and can access the admin panel through the settings button in the top navigation.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowAdminWelcome(false)}>
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSudoWelcome} onOpenChange={setShowSudoWelcome}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Welcome, Sudo User!
            </DialogTitle>
            <DialogDescription>
              You now have sudo privileges and can use all premium features without a subscription. Enjoy unlimited access to the video clipper!
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={() => setShowSudoWelcome(false)}>
              Awesome!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
