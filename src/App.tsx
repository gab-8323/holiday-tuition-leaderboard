/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, Component } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Trophy, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  BarChart3, 
  TrendingUp, 
  Search,
  LogOut,
  Lock,
  UserPlus,
  Award,
  Star,
  ArrowUp,
  ArrowDown,
  X,
  Crown,
  Sparkles,
  Zap,
  ImageIcon,
  Camera,
  Gavel,
  Coins,
  Calculator,
  Globe,
  Key,
  PenTool,
  Clock,
  Smile,
  Gamepad2,
  CheckCircle2,
  MoreHorizontal,
  ChevronLeft,
  Minus,
  Loader2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell
} from "recharts";
import { format, startOfDay, subDays, isSameDay, parseISO, startOfWeek, endOfWeek, isWithinInterval, addDays, subWeeks, addWeeks } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const categoryIcons = {
  "Attendance": CheckCircle2,
  "On Time": Clock,
  "Behavior": Smile,
  "Participation": Zap,
  "Homework": PenTool,
  "Math Quiz": Calculator,
  "Science": Globe,
  "Games": Gamepad2,
  "Special Award": Trophy,
};

const categoryDefaults = {
  "Attendance": 5,
  "On Time": 10,
  "Behavior": 1,
  "Participation": 1,
  "Homework": 10,
};

// Types
interface Student {
  id: string;
  name: string;
  photo: string | null;
  createdAt: string;
}

interface PointRecord {
  id: string;
  studentId: string;
  points: number;
  description: string;
  date: string;
  createdAt: string;
}

interface GalleryItem {
  id: string;
  url: string;
  caption: string;
  createdAt: string;
}

interface AppData {
  students: Student[];
  points: PointRecord[];
  gallery: GalleryItem[];
}

// Safe date formatter
const safeFormat = (dateStr: string | undefined | null, formatStr: string) => {
  if (!dateStr) return "N/A";
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) return "Invalid Date";
    return format(date, formatStr);
  } catch (e) {
    return "Invalid Date";
  }
};

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<any, any> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-950 flex items-center justify-center p-10 text-center border-4 border-red-500">
          <div className="max-w-md">
            <h1 className="text-4xl font-black text-white mb-6 uppercase tracking-tighter">Something went wrong</h1>
            <p className="text-red-200 mb-10 font-black text-xs uppercase tracking-[0.3em]">The royal academy has encountered an unexpected error.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-4 royal-gradient-gold text-black rounded-2xl font-black uppercase tracking-widest shadow-2xl"
            >
              Reload Academy
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, onSnapshot, setDoc, updateDoc, collection, query, getDocs, deleteDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  TRANSACTION = 'transaction'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(firebaseApp);

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function getAcademicYearOfDate(dateStr: any): string {
  try {
    if (!dateStr) return "2025-2026";
    const d = (dateStr instanceof Date) ? dateStr : new Date(dateStr);
    if (isNaN(d.getTime())) return "2025-2026";
    const year = d.getFullYear();
    if (d.getMonth() >= 5) { // June is month index 5 (0-indexed)
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  } catch (e) {
    return "2025-2026";
  }
}

function App() {
  const [data, setData] = useState<AppData>({ students: [], points: [], gallery: [] });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<"total" | "daily" | "admin" | "analytics" | "gallery" | "tender">("total");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddPoints, setShowAddPoints] = useState<string | null>(null); // studentId
  const [loading, setLoading] = useState(true);

  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkStep, setBulkStep] = useState<"category" | "students">("category");
  const [bulkCategory, setBulkCategory] = useState("Math Quiz");
  const [bulkDate, setBulkDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bulkPoints, setBulkPoints] = useState<Record<string, string>>({});
  const [dailyViewDate, setDailyViewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weeklyViewDate, setWeeklyViewDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(() => {
    try {
      return getAcademicYearOfDate(new Date());
    } catch {
      return "2025-2026";
    }
  });

  const academicYears = useMemo(() => {
    const years = new Set<string>();
    try {
      years.add(getAcademicYearOfDate(new Date()));
    } catch {
      years.add("2025-2026");
    }
    if (data && Array.isArray(data.points)) {
      data.points.forEach(p => {
        if (p.date || p.createdAt) {
          const ay = getAcademicYearOfDate(p.date || p.createdAt);
          years.add(ay);
        }
      });
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [data?.points]);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingNewCategoryBulk, setIsAddingNewCategoryBulk] = useState(false);
  const [isAddingNewCategorySingle, setIsAddingNewCategorySingle] = useState(false);
  const [singleCategory, setSingleCategory] = useState("");
  const [showAddGallery, setShowAddGallery] = useState(false);
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const [newGalleryCaption, setNewGalleryCaption] = useState("");
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number | null>(null);
  const [lightboxScale, setLightboxScale] = useState(1);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchScale, setInitialPinchScale] = useState(1);

  // Tender States
  const [tenderBids, setTenderBids] = useState<{ studentId?: string; groupId?: string; points: number }[]>([]);
  const [tenderPhase, setTenderPhase] = useState<'setup' | 'bidding' | 'reveal' | 'action' | 'settlement'>('setup');
  const [tenderMode, setTenderMode] = useState<'individual' | 'group'>('individual');
  const [tenderGroups, setTenderGroups] = useState<{ id: string; name: string; studentIds: string[]; key?: string }[]>([]);
  const [tenderSessionBalances, setTenderSessionBalances] = useState<Record<string, number>>({}); // id -> points
  const [startingPoints, setStartingPoints] = useState<number>(100);
  const [activeBidderId, setActiveBidderId] = useState<string | null>(null); // studentId or groupId
  const [tenderTurnIndex, setTenderTurnIndex] = useState<number>(0);
  const [currentBidPoints, setCurrentBidPoints] = useState<string>("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [showCelebration, setShowCelebration] = useState<{ studentName: string; points: number } | null>(null);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; studentIds: string[]; key?: string } | null>(null);
  const [balanceDiff, setBalanceDiff] = useState<{ id: string; diff: number } | null>(null);
  const prevBalancesRef = React.useRef<Record<string, number>>({});

  // Real-time Tender States (Firebase)
  const [tenderGroupKey, setTenderGroupKey] = useState<string>("");
  const [tenderResultsVisible, setTenderResultsVisible] = useState(false);
  const [tenderSettlementVisible, setTenderSettlementVisible] = useState(false);
  const [joinedGroupId, setJoinedGroupId] = useState<string | null>(localStorage.getItem('joinedGroupId'));
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  // Handle mobile back button for modals
  useEffect(() => {
    const isModalOpen = showBulkAdd || showLogin || showAddStudent || !!showAddPoints || showAddGallery || !!editingStudent || !!editingGroup || showResetConfirm;
    
    if (isModalOpen) {
      // Push a state so the back button has something to "pop"
      window.history.pushState({ modal: true }, "");
      
      const handlePopState = () => {
        if (showBulkAdd && bulkStep === "students") {
          setBulkStep("category");
          // Re-push to keep the "modal open" state in history
          window.history.pushState({ modal: true }, "");
        } else {
          // Close all modals
          setShowBulkAdd(false);
          setShowLogin(false);
          setShowAddStudent(false);
          setShowAddPoints(null);
          setShowAddGallery(false);
          setEditingStudent(null);
          setEditingGroup(null);
          setShowResetConfirm(false);
        }
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
      };
    }
  }, [showBulkAdd, bulkStep, showLogin, showAddStudent, showAddPoints, showAddGallery, editingStudent, editingGroup, showResetConfirm]);

  const handlePinchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      setInitialPinchDistance(distance);
      setInitialPinchScale(lightboxScale);
    }
  };

  const handlePinchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance) {
      const distance = Math.hypot(
        e.touches[0].pageX - e.touches[1].pageX,
        e.touches[0].pageY - e.touches[1].pageY
      );
      const newScale = (distance / initialPinchDistance) * initialPinchScale;
      setLightboxScale(Math.min(Math.max(newScale, 1), 4));
    }
  };

  const handlePinchEnd = () => {
    setInitialPinchDistance(null);
  };

  // Categories logic
  const dynamicCategories = useMemo(() => {
    const categories = new Set(["Math Quiz", "GK Challenge", "Handwriting", "On Time", "Behaviour", "Game", "Attendance", "Other"]);
    data.points.forEach(p => {
      if (p.description) categories.add(p.description);
    });
    return Array.from(categories).sort();
  }, [data.points]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user?.email === "stephenludia@gmail.com") {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }

      // Anonymous sign-in for students to satisfy Firestore rules
      if (!user) {
        signInAnonymously(auth).catch(err => {
          console.error("Anonymous Sign-in Error:", err);
        });
      }
    });
    return unsub;
  }, []);

  // Lock students to the current week & current day
  useEffect(() => {
    if (!isAdmin) {
      const today = format(new Date(), "yyyy-MM-dd");
      setDailyViewDate(today);
      setWeeklyViewDate(today);
    }
  }, [isAdmin]);

  // Firebase Real-time Sync
  useEffect(() => {
    const unsubSession = onSnapshot(doc(db, "tender_session", "current"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setTenderPhase(d.phase);
        setTenderMode(d.mode);
        setStartingPoints(d.startingPoints ?? 100);
        setActiveBidderId(d.activeBidderId);
        setTenderTurnIndex(d.turnIndex || 0);
        setTenderResultsVisible(d.resultsVisible || false);
        setTenderSettlementVisible(d.settlementVisible || false);
      }
    }, (err) => console.error("Session Sync Error:", err.message, err.code));

    const unsubBids = onSnapshot(collection(db, "tender_bids"), (snap) => {
        setTenderBids(snap.docs.map(doc => {
          const d = doc.data();
          return { 
            studentId: d.bidderId, 
            groupId: d.bidderId, 
            points: d.points,
            bidderName: d.bidderName,
            timestamp: d.timestamp
          };
        }));
    }, (err) => console.error("Bids Sync Error:", err));

    const unsubGroups = onSnapshot(query(collection(db, "tender_groups")), (snap) => {
      const groups = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      // Sort by updatedAt or name to keep consistent order
      groups.sort((a: any, b: any) => (a.updatedAt?.seconds || 0) - (b.updatedAt?.seconds || 0));
      setTenderGroups(groups);
    }, (err) => console.error("Groups Sync Error:", err));

    const unsubBalances = onSnapshot(collection(db, "tender_balances"), (snap) => {
      const balances: Record<string, number> = {};
      snap.docs.forEach(doc => {
        balances[doc.id] = doc.data().balance;
      });
      setTenderSessionBalances(balances);
    }, (err) => console.error("Balances Sync Error:", err));

    return () => {
      unsubSession();
      unsubBids();
      unsubGroups();
      unsubBalances();
    };
  }, []);

  useEffect(() => {
    if (!joinedGroupId) return;
    const oldVal = prevBalancesRef.current[joinedGroupId] ?? null;
    const newVal = tenderSessionBalances[joinedGroupId] ?? null;

    if (oldVal !== null && newVal !== null && oldVal !== newVal) {
      setBalanceDiff({ id: joinedGroupId, diff: newVal - oldVal });
      const timer = setTimeout(() => setBalanceDiff(null), 4000);
      return () => clearTimeout(timer);
    }
    prevBalancesRef.current = tenderSessionBalances;
  }, [tenderSessionBalances, joinedGroupId]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch data
  const fetchData = async () => {
    try {
      setFetchError(null);
      console.log("Fetching health check...");
      const healthRes = await fetch("/api/health").catch(e => {
        console.error("Health check fetch failed:", e);
        return null;
      });
      if (healthRes) {
        console.log("Health check status:", healthRes.status);
        const healthData = await healthRes.json().catch(() => ({}));
        console.log("Health check data:", healthData);
      }

      console.log("Fetching /api/data...");
      const res = await fetch("/api/data");
      const contentType = res.headers.get("content-type");
      
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server responded with ${res.status}: ${text.slice(0, 100)}`);
      }
      
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(`Expected JSON but got ${contentType}: ${text.slice(0, 100)}`);
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("Failed to fetch data:", err);
      setFetchError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Global Protection Logic
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Ctrl+S, Ctrl+U, Ctrl+P, Ctrl+Shift+I, F12
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'u' || e.key === 'p')) ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        return false;
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('dragstart', handleDragStart);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleAddGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryUrl) return;
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newGalleryUrl, caption: newGalleryCaption }),
      });
      if (res.ok) {
        setNewGalleryUrl("");
        setNewGalleryCaption("");
        setShowAddGallery(false);
        fetchData();
      }
    } catch (err) {
      alert("Failed to add to gallery");
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!confirm("Delete this photo from gallery?")) return;
    try {
      const res = await fetch(`/api/gallery/${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (err) {
      alert("Failed to delete photo");
    }
  };

  // Admin Login
  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.email === "stephenludia@gmail.com") {
        setIsAdmin(true);
        setShowLogin(false);
      } else {
        alert(`Access Denied: ${result.user.email} is not an admin email.`);
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      // Provide more specific error messages
      if (err.code === 'auth/popup-blocked') {
        alert("Login popup was blocked by your browser. Please allow popups for this site.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        // User closed the popup, no need to alert
      } else {
        alert(`Google Login failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      if (res.ok) {
        setIsAdmin(true);
        setShowLogin(false);
        setAdminPassword("");
      } else {
        alert("Invalid password");
      }
    } catch (err) {
      alert("Login failed");
    }
  };

  const safeParseISO = (dateStr: string | undefined | null) => {
    if (!dateStr) return new Date(0);
    try {
      const d = parseISO(dateStr);
      return isNaN(d.getTime()) ? new Date(0) : d;
    } catch {
      return new Date(0);
    }
  };

  const handlePrevPhoto = () => {
    if (selectedGalleryIndex === null) return;
    setSelectedGalleryIndex(prev => 
      prev === 0 ? data.gallery.length - 1 : (prev ?? 0) - 1
    );
  };

  const handleNextPhoto = () => {
    if (selectedGalleryIndex === null) return;
    setSelectedGalleryIndex(prev => 
      prev === data.gallery.length - 1 ? 0 : (prev ?? 0) + 1
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedGalleryIndex === null) return;
      if (e.key === "ArrowRight") handleNextPhoto();
      if (e.key === "ArrowLeft") handlePrevPhoto();
      if (e.key === "Escape") setSelectedGalleryIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedGalleryIndex]);

  // Calculations
  const resolvedDailyViewDate = useMemo(() => {
    if (isAdmin) return dailyViewDate;
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

    const hasPointsOnDay = (dateStr: string) => {
      return data.points.some(p => {
        try {
          const dStr = p.date ? p.date : format(safeParseISO(p.createdAt), "yyyy-MM-dd");
          return dStr === dateStr && p.points > 0;
        } catch {
          return false;
        }
      });
    };

    if (hasPointsOnDay(todayStr)) {
      return todayStr;
    }

    if (hasPointsOnDay(yesterdayStr)) {
      return yesterdayStr;
    }

    // Fallback to latest previous day with activity
    const pastDates = data.points
      .map(p => {
        try {
          return p.date ? p.date : format(safeParseISO(p.createdAt), "yyyy-MM-dd");
        } catch {
          return "";
        }
      })
      .filter(dStr => dStr && dStr <= todayStr);

    if (pastDates.length > 0) {
      pastDates.sort((a, b) => b.localeCompare(a));
      return pastDates[0];
    }

    return todayStr;
  }, [data.points, isAdmin, dailyViewDate]);

  const resolvedWeeklyViewDate = useMemo(() => {
    if (isAdmin) return weeklyViewDate;
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const curStart = startOfWeek(today, { weekStartsOn: 1 });
    const curEnd = endOfWeek(today, { weekStartsOn: 1 });

    const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });

    const hasPointsInInterval = (start: Date, end: Date) => {
      return data.points.some(p => {
        try {
          const pDate = safeParseISO(p.date || p.createdAt);
          return isWithinInterval(pDate, { start, end }) && p.points > 0;
        } catch {
          return false;
        }
      });
    };

    if (hasPointsInInterval(curStart, curEnd)) {
      return todayStr;
    }

    if (hasPointsInInterval(lastWeekStart, lastWeekEnd)) {
      return format(subWeeks(today, 1), "yyyy-MM-dd");
    }

    // Fallback to latest week with activity prior to current week start
    const pastPoints = data.points.filter(p => {
      try {
        const pDate = safeParseISO(p.date || p.createdAt);
        return pDate < curStart && p.points > 0;
      } catch {
        return false;
      }
    });

    if (pastPoints.length > 0) {
      const sorted = pastPoints.sort((a, b) => {
        const dateA = safeParseISO(a.date || a.createdAt).getTime();
        const dateB = safeParseISO(b.date || b.createdAt).getTime();
        return dateB - dateA;
      });
      const latestPoint = sorted[0];
      return latestPoint.date || format(safeParseISO(latestPoint.createdAt), "yyyy-MM-dd");
    }

    return todayStr;
  }, [data.points, isAdmin, weeklyViewDate]);

  const dailyStarsTitleInfo = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
    
    if (isAdmin) {
      return {
        title: "DAILY STARS",
        subtitle: `Royal Performers for ${format(safeParseISO(resolvedDailyViewDate), "MMMM dd")}`
      };
    }
    
    if (resolvedDailyViewDate === todayStr) {
      return {
        title: "TODAY'S DAILY STARS",
        subtitle: `Royal Performers for Today, ${format(safeParseISO(resolvedDailyViewDate), "MMMM dd")}`
      };
    } else if (resolvedDailyViewDate === yesterdayStr) {
      return {
        title: "YESTERDAY'S DAILY STARS",
        subtitle: `Royal Performers for Yesterday, ${format(safeParseISO(resolvedDailyViewDate), "MMMM dd")} (Last Updated)`
      };
    } else {
      return {
        title: "PREVIOUS DAILY STARS",
        subtitle: `Royal Performers for ${format(safeParseISO(resolvedDailyViewDate), "MMMM dd, yyyy")} (Last Updated)`
      };
    }
  }, [resolvedDailyViewDate, isAdmin]);

  const weeklyStarsTitleInfo = useMemo(() => {
    const start = format(startOfWeek(safeParseISO(resolvedWeeklyViewDate), { weekStartsOn: 1 }), "MMM dd");
    const end = format(endOfWeek(safeParseISO(resolvedWeeklyViewDate), { weekStartsOn: 1 }), "MMM dd, yyyy");
    
    if (isAdmin) {
      return {
        title: "Weekly Hall of Fame",
        subtitle: `${start} - ${end}`
      };
    }

    const today = new Date();
    const curStart = startOfWeek(today, { weekStartsOn: 1 });
    const curEnd = endOfWeek(today, { weekStartsOn: 1 });
    const resolvedDate = safeParseISO(resolvedWeeklyViewDate);
    const inCurrentWeek = isWithinInterval(resolvedDate, { start: curStart, end: curEnd });

    const lastWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
    const inLastWeek = isWithinInterval(resolvedDate, { start: lastWeekStart, end: lastWeekEnd });

    if (inCurrentWeek) {
      return {
        title: "Weekly Hall of Fame",
        subtitle: `${start} - ${end} (Current Week)`
      };
    } else if (inLastWeek) {
      return {
        title: "LAST WEEK'S HALL OF FAME",
        subtitle: `${start} - ${end} (Previous Week / Last Updated)`
      };
    } else {
      return {
        title: "PREVIOUS WEEK'S HALL OF FAME",
        subtitle: `${start} - ${end} (Last Updated)`
      };
    }
  }, [resolvedWeeklyViewDate, isAdmin]);

  const allTimeStats = useMemo(() => {
    const today = startOfDay(new Date());
    return data.students.map(student => {
      const points = data.points.filter(p => {
        if (p.studentId !== student.id) return false;
        if (selectedAcademicYear === "all") return true;
        return getAcademicYearOfDate(p.date || p.createdAt) === selectedAcademicYear;
      });
      const totalPoints = points.reduce((sum, p) => sum + p.points, 0);
      const dailyPoints = data.points
        .filter(p => p.studentId === student.id && isSameDay(safeParseISO(p.date), today))
        .reduce((sum, p) => sum + p.points, 0);
      
      return {
        ...student,
        totalPoints,
        dailyPoints,
        allTimePoints: totalPoints, // In all-time stats, totalPoints IS allTimePoints
        history: points.sort((a, b) => safeParseISO(b.date).getTime() - safeParseISO(a.date).getTime())
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [data, selectedAcademicYear]);

  const weeklyLeaderboard = useMemo(() => {
    const targetDate = safeParseISO(resolvedWeeklyViewDate);
    const start = startOfWeek(targetDate, { weekStartsOn: 1 });
    const end = endOfWeek(targetDate, { weekStartsOn: 1 });

    return data.students.map(student => {
      const points = data.points
        .filter(p => {
          const pDate = safeParseISO(p.date);
          return p.studentId === student.id && isWithinInterval(pDate, { start, end });
        })
        .reduce((sum, p) => sum + p.points, 0);
      
      const allPoints = data.points.filter(p => {
        if (p.studentId !== student.id) return false;
        if (selectedAcademicYear === "all") return true;
        return getAcademicYearOfDate(p.date || p.createdAt) === selectedAcademicYear;
      });
      const allTimePoints = allPoints.reduce((sum, p) => sum + p.points, 0);

      return { 
        ...student, 
        totalPoints: points, // Points for this week
        allTimePoints,
        history: allPoints.sort((a, b) => safeParseISO(b.date).getTime() - safeParseISO(a.date).getTime())
      };
    }).filter(s => s.totalPoints > 0).sort((a, b) => (b.totalPoints - a.totalPoints) || (b.allTimePoints - a.allTimePoints));
  }, [data, resolvedWeeklyViewDate, selectedAcademicYear]);

  const dailyLeaderboard = useMemo(() => {
    const targetDate = safeParseISO(resolvedDailyViewDate);
    return data.students.map(student => {
      const points = data.points
        .filter(p => p.studentId === student.id && isSameDay(safeParseISO(p.date), targetDate))
        .reduce((sum, p) => sum + p.points, 0);
      
      const allPoints = data.points.filter(p => {
        if (p.studentId !== student.id) return false;
        if (selectedAcademicYear === "all") return true;
        return getAcademicYearOfDate(p.date || p.createdAt) === selectedAcademicYear;
      });
      const allTimePoints = allPoints.reduce((sum, p) => sum + p.points, 0);

      return { ...student, totalPoints: points, allTimePoints }; // Reuse totalPoints key for consistent UI
    }).filter(s => s.totalPoints > 0).sort((a, b) => (b.totalPoints - a.totalPoints) || (b.allTimePoints - a.allTimePoints));
  }, [data, resolvedDailyViewDate, selectedAcademicYear]);

  const filteredLeaderboard = weeklyLeaderboard.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const top3 = weeklyLeaderboard.slice(0, 3);

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Award className="w-6 h-6 text-slate-400" />;
    if (index === 2) return <Award className="w-6 h-6 text-amber-700" />;
    return <span className="text-slate-400 font-bold w-6 text-center">{index + 1}</span>;
  };

  const getBadge = (points: number) => {
    if (points >= 500) return "👑 Master";
    if (points >= 200) return "🌟 Star";
    if (points >= 100) return "🔥 Pro";
    if (points >= 50) return "🚀 Rising";
    return null;
  };


  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 selection:bg-royal-gold selection:text-black overflow-x-hidden">
      <div className="noise-overlay" />
      
      {/* Sleek Golden-White Loading Line */}
      {loading && (
        <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-royal-gold via-amber-300 to-royal-gold z-[100] overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent"
          />
        </div>
      )}
      
      {/* Dynamic Spotlight Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            x: [0, 100, -100, 0],
            y: [0, -50, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[150px] rounded-full"
        />
        <motion.div 
          animate={{
            x: [0, -120, 120, 0],
            y: [0, 80, -80, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-royal-gold/5 blur-[150px] rounded-full"
        />
      </div>

      {/* Floating Particles */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%",
              opacity: Math.random() * 0.5
            }}
            animate={{
              y: ["-10%", "110%"],
              opacity: [0, 0.3, 0]
            }}
            transition={{
              duration: Math.random() * 10 + 15,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10
            }}
            className="absolute w-1 h-1 bg-royal-gold rounded-full blur-[1px]"
          />
        ))}
      </div>

      {/* Point Feedback Overlay */}
      <AnimatePresence mode="wait">
        {balanceDiff && (
          <motion.div 
            key={`${balanceDiff.id}-${balanceDiff.diff}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
            className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center px-4 overflow-hidden"
          >
            {/* Ambient Particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 0,
                  scale: 0
                }}
                animate={{ 
                  x: (Math.random() - 0.5) * 600, 
                  y: (Math.random() - 0.5) * 600, 
                  opacity: [0, 1, 0],
                  scale: Math.random() * 2 + 1,
                  rotate: Math.random() * 360
                }}
                transition={{ 
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                className={cn(
                  "absolute w-2 h-2 rounded-full",
                  balanceDiff.diff > 0 ? "bg-emerald-400/60" : "bg-red-500/60"
                )}
              />
            ))}

            {/* Background Glow Pulse */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ 
                scale: [1, 2, 1.5], 
                opacity: [0, 0.7, 0.3],
              }}
              className={cn(
                "absolute w-[400px] h-[400px] rounded-full blur-[100px]",
                balanceDiff.diff > 0 ? "bg-emerald-500/30" : "bg-red-600/30"
              )}
            />

            <motion.div 
              initial={{ y: 150, scale: 0.4, rotate: balanceDiff.diff > 0 ? 10 : -10 }}
              animate={{ 
                y: -100, 
                scale: 1,
                rotate: 0,
                x: balanceDiff.diff < 0 ? [0, -20, 20, -20, 20, -10, 10, 0] : 0
              }}
              transition={{ 
                x: { duration: 0.4, ease: "easeInOut" },
                default: { type: "spring", damping: 8, stiffness: 100 }
              }}
              className={cn(
                "relative px-10 py-12 md:px-16 md:py-16 rounded-[3.5rem] border-[8px] flex flex-col items-center gap-2 transition-all duration-500",
                balanceDiff.diff > 0 
                  ? "bg-slate-900/95 border-emerald-500 shadow-[0_0_120px_rgba(16,185,129,0.6)]" 
                  : "bg-slate-900/95 border-red-500 shadow-[0_0_120px_rgba(239,68,68,0.6)]"
              )}
            >
              <div className="absolute inset-0 rounded-[3rem] overflow-hidden">
                <motion.div 
                  animate={{ 
                    background: balanceDiff.diff > 0 
                      ? ["linear-gradient(45deg, transparent, rgba(16,185,129,0.1), transparent)"]
                      : ["linear-gradient(45deg, transparent, rgba(239,68,68,0.1), transparent)"],
                    x: ["-100%", "200%"]
                  }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 w-full h-full"
                />
              </div>

              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, type: "spring" }}
                className={cn(
                  "text-8xl md:text-[12rem] font-black font-mono tracking-tighter leading-none mb-4",
                  balanceDiff.diff > 0 ? "text-emerald-400" : "text-red-400"
                )}
              >
                {balanceDiff.diff > 0 ? '+' : ''}{balanceDiff.diff}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center space-y-4"
              >
                <p className="text-white font-black uppercase tracking-[0.5em] text-xs md:text-lg text-center">
                  Points {balanceDiff.diff > 0 ? 'Awarded' : 'Deducted'}
                </p>
                <div className={cn(
                  "h-2 w-24 rounded-full",
                  balanceDiff.diff > 0 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)]" : "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)]"
                )} />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Lightbox */}
      <AnimatePresence>
        {selectedGalleryIndex !== null && data.gallery[selectedGalleryIndex] && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center overflow-hidden"
            onClick={() => {
              setSelectedGalleryIndex(null);
              setLightboxScale(1);
            }}
          >
            <button 
              onClick={() => {
                setSelectedGalleryIndex(null);
                setLightboxScale(1);
              }}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-4 text-white/50 hover:text-white transition-colors z-[120]"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Desktop Navigation Buttons - Hidden on Mobile */}
            <div className="hidden sm:block absolute left-10 top-1/2 -translate-y-1/2 z-[110]">
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrevPhoto(); setLightboxScale(1); }}
                className="p-4 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <ArrowDown className="w-6 h-6 rotate-90" />
              </button>
            </div>

            <div className="hidden sm:block absolute right-10 top-1/2 -translate-y-1/2 z-[110]">
              <button 
                onClick={(e) => { e.stopPropagation(); handleNextPhoto(); setLightboxScale(1); }}
                className="p-4 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
              >
                <ArrowDown className="w-6 h-6 -rotate-90" />
              </button>
            </div>

            <motion.div 
              key={selectedGalleryIndex}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag={lightboxScale === 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (lightboxScale > 1) return;
                const swipe = info.offset.x;
                if (swipe < -50) handleNextPhoto();
                else if (swipe > 50) handlePrevPhoto();
              }}
              className="relative w-full h-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full flex flex-col items-center justify-center p-4 sm:p-20">
                <motion.div 
                  className="relative w-full max-w-5xl aspect-square sm:aspect-video rounded-[2rem] sm:rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] cursor-zoom-in touch-none"
                  animate={{ scale: lightboxScale }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  onDoubleClick={() => setLightboxScale(prev => prev === 1 ? 2 : 1)}
                  onTouchStart={handlePinchStart}
                  onTouchMove={handlePinchMove}
                  onTouchEnd={handlePinchEnd}
                >
                  <img 
                    src={data.gallery[selectedGalleryIndex].url} 
                    alt={data.gallery[selectedGalleryIndex].caption}
                    className="w-full h-full object-contain bg-black/40 select-none"
                    referrerPolicy="no-referrer"
                    draggable={false}
                  />
                </motion.div>
                
                <div className="text-center max-w-2xl px-4 mt-6 sm:mt-10">
                  <motion.h3 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl sm:text-4xl font-black text-white uppercase tracking-tighter mb-2"
                  >
                    {data.gallery[selectedGalleryIndex].caption || "Untitled Moment"}
                  </motion.h3>
                  <motion.p 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-royal-gold font-black uppercase tracking-[0.4em] text-[10px] sm:text-sm"
                  >
                    {safeFormat(data.gallery[selectedGalleryIndex].createdAt, "MMMM dd, yyyy")}
                  </motion.p>
                </div>

                {/* Mobile Swipe Indicator */}
                <div className="sm:hidden mt-4 text-white/30 text-[8px] font-black uppercase tracking-[0.3em]">
                  Swipe to navigate • Pinch or double tap to zoom
                </div>

                <div className="flex gap-2 mt-6 sm:mt-8">
                  {data.gallery.map((_, i) => (
                    <button 
                      key={i}
                      onClick={() => { setSelectedGalleryIndex(i); setLightboxScale(1); }}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-500",
                        i === selectedGalleryIndex ? "w-8 bg-royal-gold" : "bg-white/20 hover:bg-white/40"
                      )}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-black/60 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-40 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="relative group flex-shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-royal-gold to-amber-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-black p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/10 shadow-2xl rotate-3 group-hover:rotate-0 transition-all">
                <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-royal-gold" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-slate-500 truncate">
                LEADERBOARD
              </h1>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full",
                  loading ? "bg-amber-400 animate-ping" : "bg-royal-gold animate-pulse"
                )} />
                <p className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] truncate">
                  {loading ? "Syncing stats..." : "Tuition Excellence"}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {isAdmin && (
              <button 
                onClick={() => {
                  setBulkPoints({});
                  setShowBulkAdd(true);
                }}
                className="relative group overflow-hidden px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-sm transition-all"
              >
                <div className="absolute inset-0 royal-gradient-gold opacity-90 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 shimmer opacity-30" />
                <div className="relative flex items-center gap-2 text-black">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">ADD MARKS</span>
                  <span className="sm:hidden">MARKS</span>
                </div>
              </button>
            )}
            {isAdmin ? (
              <button 
                onClick={() => setIsAdmin(false)}
                className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            ) : (
              <button 
                onClick={() => setShowLogin(true)}
                className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-royal-gold hover:bg-royal-gold/10 transition-all"
              >
                <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 relative z-10">
        {/* Error Callout */}
        {fetchError && (
          <div className="mb-8 p-6 bg-red-950/40 border border-red-500/30 rounded-[2rem] max-w-xl mx-auto text-center backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
            <p className="text-red-400 text-xs sm:text-sm font-black uppercase tracking-widest leading-loose mb-4">
              Error fetching leaderboard: {fetchError}
            </p>
            <button 
              onClick={() => fetchData()}
              className="relative px-6 py-3 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg hover:shadow-red-500/20 active:scale-95"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center overflow-x-auto no-scrollbar bg-white/5 backdrop-blur-xl p-1 sm:p-2 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 mb-6 sm:mb-12 shadow-3xl">
          {[
            { id: "total", label: "HALL OF FAME", icon: Award },
            { id: "daily", label: "DAILY STARS", icon: Sparkles },
            { id: "gallery", label: "GALLERY", icon: ImageIcon },
            { id: "analytics", label: "INSIGHTS", icon: BarChart3 },
            { id: "tender", label: "TENDER", icon: Gavel },
            ...(isAdmin ? [
              { id: "admin", label: "ROSTER", icon: Users }
            ] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1 sm:gap-3 px-3 sm:px-10 py-2.5 sm:py-5 rounded-[1.2rem] sm:rounded-[2rem] text-[8px] sm:text-xs font-black transition-all whitespace-nowrap flex-1 min-w-max justify-center tracking-tight sm:tracking-[0.2em] relative group",
                activeTab === tab.id 
                  ? "text-black" 
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 royal-gradient-gold rounded-[1.2rem] sm:rounded-[2rem] shadow-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <tab.icon className={cn("w-3 h-3 sm:w-4 sm:h-4 relative z-10", activeTab === tab.id ? "text-black" : "")} />
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {activeTab === "total" && (
            <div className="space-y-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-8 text-center sm:text-left">
                <div className="flex flex-col items-center sm:items-start animate-fade-in">
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 uppercase whitespace-nowrap">
                    {weeklyStarsTitleInfo.title}
                  </h2>
                  <p className="text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-[0.3em] mt-1">
                    {weeklyStarsTitleInfo.subtitle}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden self-center sm:self-auto">
                    <button 
                      onClick={() => setWeeklyViewDate(format(subWeeks(safeParseISO(weeklyViewDate), 1), "yyyy-MM-dd"))}
                      className="p-3 sm:p-4 hover:bg-white/10 text-slate-400 hover:text-white transition-all border-r border-white/5"
                    >
                      <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 rotate-90" />
                    </button>
                    <div className="px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 relative">
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-royal-gold" />
                      <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">Select Week</span>
                      <input 
                        type="date" 
                        value={weeklyViewDate || ""}
                        onChange={(e) => setWeeklyViewDate(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <button 
                      onClick={() => setWeeklyViewDate(format(addWeeks(safeParseISO(weeklyViewDate), 1), "yyyy-MM-dd"))}
                      className="p-3 sm:p-4 hover:bg-white/10 text-slate-400 hover:text-white transition-all border-l border-white/5"
                    >
                      <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 -rotate-90" />
                    </button>
                  </div>
                )}
              </div>

              {weeklyLeaderboard.length > 0 ? (
                <>
                  {/* Top 3 Podium */}
                  <div className="flex justify-center items-end gap-2 sm:gap-10 pt-16 sm:pt-20 pb-8 sm:pb-12">
                    {/* 2nd Place */}
                    <motion.div 
                      whileHover={{ y: -10, scale: 1.02 }}
                      className="flex flex-col items-center group cursor-pointer"
                      onClick={() => setSelectedStudentId(top3[1]?.id)}
                    >
                      <div className="relative mb-4 sm:mb-6">
                        <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-400/30 overflow-hidden bg-slate-900 shadow-2xl rotate-[-4deg] group-hover:rotate-0 transition-all duration-700">
                          {top3[1]?.photo ? (
                            <img src={top3[1].photo} alt={top3[1].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-700">
                              <Users className="w-8 h-8 sm:w-12 sm:h-12" />
                            </div>
                          )}
                        </div>
                        <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 bg-slate-400 text-slate-900 text-[8px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-xl rotate-[-12deg] border border-white/20">SILVER</div>
                      </div>
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 sm:p-5 rounded-2xl sm:rounded-3xl text-center w-20 sm:w-48 shadow-2xl group-hover:border-slate-400/30 transition-all">
                        <p className="text-[8px] sm:text-xs font-black text-slate-400 truncate mb-0.5 sm:mb-1 uppercase tracking-widest">{top3[1]?.name || "---"}</p>
                        <p className="text-xl sm:text-3xl font-black text-white font-mono">{top3[1]?.totalPoints || 0}</p>
                      </div>
                      <div className="h-12 sm:h-20 w-full bg-gradient-to-b from-slate-400/20 to-transparent rounded-t-2xl sm:rounded-t-3xl mt-2 sm:mt-3" />
                    </motion.div>

                    {/* 1st Place */}
                    <motion.div 
                      whileHover={{ y: -20, scale: 1.05 }}
                      className="flex flex-col items-center group -translate-y-8 sm:-translate-y-12 cursor-pointer z-10"
                      onClick={() => setSelectedStudentId(top3[0]?.id)}
                    >
                      <div className="relative mb-6 sm:mb-8">
                        <motion.div 
                          animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                          className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 z-20"
                        >
                          <Crown className="w-10 h-10 sm:w-16 sm:h-16 text-royal-gold drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" />
                        </motion.div>
                        <div className="relative">
                          <div className="absolute -inset-3 sm:-inset-4 royal-gradient-gold rounded-[2rem] sm:rounded-[3rem] blur-xl sm:blur-2xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                          <div className="relative w-28 h-28 sm:w-48 sm:h-48 rounded-[2rem] sm:rounded-[3rem] border-4 border-royal-gold/50 overflow-hidden bg-slate-900 shadow-[0_0_60px_rgba(255,215,0,0.15)] rotate-[4deg] group-hover:rotate-0 transition-all duration-700">
                            {top3[0]?.photo ? (
                              <img src={top3[0].photo} alt={top3[0].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <Users className="w-12 h-12 sm:w-20 sm:h-20" />
                              </div>
                            )}
                            <div className="absolute inset-0 shimmer opacity-20" />
                          </div>
                        </div>
                        <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 royal-gradient-gold text-black text-[8px] sm:text-[10px] font-black px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-2xl rotate-[12deg] border border-white/20">CHAMPION</div>
                      </div>
                      <div className="relative group">
                        <div className="absolute -inset-1 royal-gradient-gold rounded-[1.5rem] sm:rounded-[2.5rem] blur opacity-20"></div>
                        <div className="relative bg-black border border-royal-gold/30 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] text-center w-28 sm:w-64 shadow-3xl group-hover:border-royal-gold transition-all">
                          <p className="text-[10px] sm:text-sm font-black text-royal-gold truncate mb-0.5 sm:mb-1 uppercase tracking-[0.1em] sm:tracking-[0.2em]">{top3[0]?.name || "---"}</p>
                          <p className="text-2xl sm:text-5xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">{top3[0]?.totalPoints || 0}</p>
                        </div>
                      </div>
                      <div className="h-20 sm:h-32 w-full bg-gradient-to-b from-royal-gold/20 to-transparent rounded-t-[1.5rem] sm:rounded-t-[2.5rem] mt-2 sm:mt-3" />
                    </motion.div>

                    {/* 3rd Place */}
                    <motion.div 
                      whileHover={{ y: -10, scale: 1.02 }}
                      className="flex flex-col items-center group cursor-pointer"
                      onClick={() => setSelectedStudentId(top3[2]?.id)}
                    >
                      <div className="relative mb-4 sm:mb-6">
                        <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-amber-800/30 overflow-hidden bg-slate-900 shadow-2xl rotate-[4deg] group-hover:rotate-0 transition-all duration-700">
                          {top3[2]?.photo ? (
                            <img src={top3[2].photo} alt={top3[2].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-700">
                              <Users className="w-8 h-8 sm:w-12 sm:h-12" />
                            </div>
                          )}
                        </div>
                        <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-amber-800 text-white text-[8px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-xl rotate-[12deg] border border-white/20">BRONZE</div>
                      </div>
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 sm:p-5 rounded-2xl sm:rounded-3xl text-center w-20 sm:w-48 shadow-2xl group-hover:border-amber-800/30 transition-all">
                        <p className="text-[8px] sm:text-xs font-black text-slate-400 truncate mb-0.5 sm:mb-1 uppercase tracking-widest">{top3[2]?.name || "---"}</p>
                        <p className="text-xl sm:text-3xl font-black text-white font-mono">{top3[2]?.totalPoints || 0}</p>
                      </div>
                      <div className="h-10 sm:h-16 w-full bg-gradient-to-b from-amber-800/20 to-transparent rounded-t-2xl sm:rounded-t-3xl mt-2 sm:mt-3" />
                    </motion.div>
                  </div>

                  {/* List - Modern Glass Card */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden"
                  >
                    {filteredLeaderboard.map((student, index) => (
                      <motion.div 
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedStudentId(student.id)}
                        className="group flex items-center gap-3 sm:gap-6 p-4 sm:p-6 hover:bg-white/5 transition-all cursor-pointer border-b border-white/5 last:border-0 relative overflow-hidden"
                        whileHover={{ x: 10, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                      >
                        {index === 0 && <div className="absolute inset-0 shimmer opacity-[0.03] pointer-events-none" />}
                        <div className="w-8 sm:w-12 flex justify-center flex-shrink-0">
                          {index < 3 ? (
                            <div className={cn(
                              "w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-[10px] sm:text-sm shadow-xl border border-white/20",
                              index === 0 ? "royal-gradient-gold text-black" :
                              index === 1 ? "bg-slate-300 text-slate-900" :
                              "bg-amber-800 text-white"
                            )}>
                              {index + 1}
                            </div>
                          ) : (
                            <span className="text-slate-600 font-black text-sm sm:text-xl font-mono">{index + 1}</span>
                          )}
                        </div>
                        <div className="relative flex-shrink-0">
                          <div className={cn(
                            "w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                            index === 0 ? "border-royal-gold/50 shadow-[0_0_20px_rgba(255,215,0,0.2)]" : "border-white/10"
                          )}>
                            {student.photo ? (
                              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                              </div>
                            )}
                          </div>
                          {index === 0 && (
                            <div className="absolute -top-1.5 -right-1.5 bg-royal-gold rounded-full p-0.5 sm:p-1 shadow-xl">
                              <Crown className="w-2 h-2 sm:w-3 sm:h-3 text-black" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                            <h3 className="font-black text-sm sm:text-xl text-white truncate tracking-tight group-hover:text-royal-gold transition-colors">{student.name}</h3>
                            {getBadge(student.totalPoints) && (
                              <span className="hidden sm:inline-block text-[8px] sm:text-[10px] font-black bg-white/5 text-slate-400 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl uppercase tracking-widest border border-white/10">
                                {getBadge(student.totalPoints)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:gap-5 mt-0.5 sm:mt-1.5">
                            <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em]">Rank #{index + 1}</p>
                            <div className="h-0.5 w-0.5 sm:h-1 sm:w-1 rounded-full bg-slate-800" />
                            <p className="hidden sm:block text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{student.history.length} Achievements</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn(
                            "text-xl sm:text-3xl font-black font-mono transition-colors",
                            index === 0 ? "text-royal-gold" : "text-white group-hover:text-royal-gold"
                          )}>{student.totalPoints}</p>
                          <p className="text-[8px] sm:text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Points</p>
                        </div>
                        <ChevronRight className="hidden sm:block w-6 h-6 text-slate-800 group-hover:text-royal-gold group-hover:translate-x-1 transition-all" />
                      </motion.div>
                    ))}
                  </motion.div>
                </>
              ) : (
                <div className="py-32 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10 backdrop-blur-sm">
                  <div className="bg-white/5 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-3xl border border-white/10">
                    <Trophy className="w-12 h-12 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-black text-2xl uppercase tracking-[0.3em]">No activity recorded for this week</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "daily" && (
            <div className="space-y-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-8 text-center sm:text-left">
                <div className="flex flex-col items-center sm:items-start animate-fade-in">
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 uppercase whitespace-nowrap">
                    {dailyStarsTitleInfo.title}
                  </h2>
                  <p className="text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-[0.3em] mt-1">
                    {dailyStarsTitleInfo.subtitle}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-3 rounded-2xl sm:rounded-3xl shadow-2xl group self-center sm:self-auto">
                    <Calendar className="w-5 h-5 text-royal-gold ml-3 group-hover:scale-110 transition-transform" />
                    <input 
                      type="date" 
                      value={dailyViewDate || ""}
                      onChange={(e) => setDailyViewDate(e.target.value)}
                      className="bg-transparent text-white font-black text-sm outline-none pr-6 py-2 uppercase tracking-widest cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {dailyLeaderboard.length > 0 ? (
                <div className="space-y-12">
                  {/* Daily Podium */}
                  <div className="flex justify-center items-end gap-2 sm:gap-10 pt-16 sm:pt-20 pb-8 sm:pb-12">
                    {/* 2nd Place */}
                    {dailyLeaderboard[1] && (
                      <motion.div 
                        whileHover={{ y: -10, scale: 1.02 }}
                        className="flex flex-col items-center group cursor-pointer"
                        onClick={() => setSelectedStudentId(dailyLeaderboard[1].id)}
                      >
                        <div className="relative mb-4 sm:mb-6">
                          <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-slate-400/30 overflow-hidden bg-slate-900 shadow-2xl rotate-[-4deg] group-hover:rotate-0 transition-all duration-700">
                            {dailyLeaderboard[1].photo ? (
                              <img src={dailyLeaderboard[1].photo} alt={dailyLeaderboard[1].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <Users className="w-8 h-8 sm:w-12 sm:h-12" />
                              </div>
                            )}
                          </div>
                          <div className="absolute -top-3 -left-3 sm:-top-4 sm:-left-4 bg-slate-400 text-slate-900 text-[8px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-xl rotate-[-12deg] border border-white/20">SILVER</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 sm:p-5 rounded-2xl sm:rounded-3xl text-center w-20 sm:w-48 shadow-2xl group-hover:border-slate-400/30 transition-all">
                          <p className="text-[8px] sm:text-xs font-black text-slate-400 truncate mb-0.5 sm:mb-1 uppercase tracking-widest">{dailyLeaderboard[1].name}</p>
                          <p className="text-xl sm:text-3xl font-black text-white font-mono">{dailyLeaderboard[1].totalPoints}</p>
                        </div>
                        <div className="h-12 sm:h-20 w-full bg-gradient-to-b from-slate-400/20 to-transparent rounded-t-2xl sm:rounded-t-3xl mt-2 sm:mt-3" />
                      </motion.div>
                    )}

                    {/* 1st Place */}
                    {dailyLeaderboard[0] && (
                      <motion.div 
                        whileHover={{ y: -20, scale: 1.05 }}
                        className="flex flex-col items-center group -translate-y-8 sm:-translate-y-12 cursor-pointer z-10"
                        onClick={() => setSelectedStudentId(dailyLeaderboard[0].id)}
                      >
                        <div className="relative mb-6 sm:mb-8">
                          <motion.div 
                            animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-12 sm:-top-16 left-1/2 -translate-x-1/2 z-20"
                          >
                            <Crown className="w-10 h-10 sm:w-16 sm:h-16 text-royal-gold drop-shadow-[0_0_20px_rgba(255,215,0,0.6)]" />
                          </motion.div>
                          <div className="relative">
                            <div className="absolute -inset-3 sm:-inset-4 royal-gradient-gold rounded-[2rem] sm:rounded-[3rem] blur-xl sm:blur-2xl opacity-0 group-hover:opacity-20 transition-opacity"></div>
                            <div className="relative w-28 h-28 sm:w-48 sm:h-48 rounded-[2rem] sm:rounded-[3rem] border-4 border-royal-gold/50 overflow-hidden bg-slate-900 shadow-[0_0_60px_rgba(255,215,0,0.15)] rotate-[4deg] group-hover:rotate-0 transition-all duration-700">
                              {dailyLeaderboard[0].photo ? (
                                <img src={dailyLeaderboard[0].photo} alt={dailyLeaderboard[0].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-700">
                                  <Users className="w-12 h-12 sm:w-20 sm:h-20" />
                                </div>
                              )}
                              <div className="absolute inset-0 shimmer opacity-20" />
                            </div>
                          </div>
                          <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 royal-gradient-gold text-black text-[8px] sm:text-[10px] font-black px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl shadow-2xl rotate-[12deg] border border-white/20">CHAMPION</div>
                        </div>
                        <div className="relative group">
                          <div className="absolute -inset-1 royal-gradient-gold rounded-[1.5rem] sm:rounded-[2.5rem] blur opacity-20"></div>
                          <div className="relative bg-black border border-royal-gold/30 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] text-center w-28 sm:w-64 shadow-3xl group-hover:border-royal-gold transition-all">
                            <p className="text-[10px] sm:text-sm font-black text-royal-gold truncate mb-0.5 sm:mb-1 uppercase tracking-[0.1em] sm:tracking-[0.2em]">{dailyLeaderboard[0].name}</p>
                            <p className="text-2xl sm:text-5xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">{dailyLeaderboard[0].totalPoints}</p>
                          </div>
                        </div>
                        <div className="h-20 sm:h-32 w-full bg-gradient-to-b from-royal-gold/20 to-transparent rounded-t-[1.5rem] sm:rounded-t-[2.5rem] mt-2 sm:mt-3" />
                      </motion.div>
                    )}

                    {/* 3rd Place */}
                    {dailyLeaderboard[2] && (
                      <motion.div 
                        whileHover={{ y: -10, scale: 1.02 }}
                        className="flex flex-col items-center group cursor-pointer"
                        onClick={() => setSelectedStudentId(dailyLeaderboard[2].id)}
                      >
                        <div className="relative mb-4 sm:mb-6">
                          <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-amber-800/30 overflow-hidden bg-slate-900 shadow-2xl rotate-[4deg] group-hover:rotate-0 transition-all duration-700">
                            {dailyLeaderboard[2].photo ? (
                              <img src={dailyLeaderboard[2].photo} alt={dailyLeaderboard[2].name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <Users className="w-8 h-8 sm:w-12 sm:h-12" />
                              </div>
                            )}
                          </div>
                          <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 bg-amber-800 text-white text-[8px] sm:text-[10px] font-black px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-xl rotate-[12deg] border border-white/20">BRONZE</div>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-3 sm:p-5 rounded-2xl sm:rounded-3xl text-center w-20 sm:w-48 shadow-2xl group-hover:border-amber-800/30 transition-all">
                          <p className="text-[8px] sm:text-xs font-black text-slate-400 truncate mb-0.5 sm:mb-1 uppercase tracking-widest">{dailyLeaderboard[2].name}</p>
                          <p className="text-xl sm:text-3xl font-black text-white font-mono">{dailyLeaderboard[2].totalPoints}</p>
                        </div>
                        <div className="h-10 sm:h-16 w-full bg-gradient-to-b from-amber-800/20 to-transparent rounded-t-2xl sm:rounded-t-3xl mt-2 sm:mt-3" />
                      </motion.div>
                    )}
                  </div>

                  {/* Daily List */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden"
                  >
                    {dailyLeaderboard.map((student, index) => (
                      <motion.div 
                        key={student.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedStudentId(student.id)}
                        className="group flex items-center gap-3 sm:gap-6 p-4 sm:p-6 hover:bg-white/5 transition-all cursor-pointer border-b border-white/5 last:border-0 relative overflow-hidden"
                        whileHover={{ x: 10, backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                      >
                        <div className="w-8 sm:w-12 flex justify-center flex-shrink-0">
                          {index < 3 ? (
                            <div className={cn(
                              "w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-[10px] sm:text-sm shadow-xl border border-white/20",
                              index === 0 ? "royal-gradient-gold text-black" :
                              index === 1 ? "bg-slate-300 text-slate-900" :
                              "bg-amber-800 text-white"
                            )}>
                              {index + 1}
                            </div>
                          ) : (
                            <span className="text-slate-600 font-black text-sm sm:text-xl font-mono">{index + 1}</span>
                          )}
                        </div>
                        <div className="relative flex-shrink-0">
                          <div className={cn(
                            "w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3",
                            index === 0 ? "border-royal-gold/50 shadow-[0_0_20px_rgba(255,215,0,0.2)]" : "border-white/10"
                          )}>
                            {student.photo ? (
                              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <Users className="w-6 h-6 sm:w-8 sm:h-8" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-4">
                            <h3 className="font-black text-sm sm:text-xl text-white truncate tracking-tight group-hover:text-royal-gold transition-colors">{student.name}</h3>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-5 mt-0.5 sm:mt-1.5">
                            <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em]">Daily Rank #{index + 1}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={cn(
                            "text-xl sm:text-3xl font-black font-mono transition-colors",
                            index === 0 ? "text-royal-gold" : "text-white group-hover:text-royal-gold"
                          )}>{student.totalPoints}</p>
                          <p className="text-[8px] sm:text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em]">Today's Pts</p>
                        </div>
                        <ChevronRight className="hidden sm:block w-6 h-6 text-slate-800 group-hover:text-royal-gold group-hover:translate-x-1 transition-all" />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              ) : (
                <div className="py-32 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10 backdrop-blur-sm">
                  <div className="bg-white/5 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-3xl border border-white/10">
                    <Calendar className="w-12 h-12 text-slate-500" />
                  </div>
                  <p className="text-slate-500 font-black text-2xl uppercase tracking-[0.3em]">No activity recorded for this date</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-10">
              {/* Academic Year Selection Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/5 animate-fade-in">
                <div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 uppercase whitespace-nowrap">Academic Year Stats</h2>
                  <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em] mt-1 text-center sm:text-left">
                    Viewing {selectedAcademicYear === "all" ? "All-Time grand total" : `Academic Cycle ${selectedAcademicYear}`}
                  </p>
                </div>
                
                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-2.5 rounded-2xl sm:rounded-3xl shadow-2xl self-center sm:self-auto">
                  <span className="text-slate-400 font-bold text-xs uppercase tracking-widest pl-4">Year:</span>
                  <select
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    className="bg-transparent text-white font-black text-xs outline-none pr-8 py-2 uppercase tracking-widest cursor-pointer border-0 ring-0 focus:ring-0"
                  >
                    {academicYears.map((ay) => (
                      <option key={ay} value={ay} className="bg-slate-950 text-white font-black uppercase tracking-widest">
                        {ay}
                      </option>
                    ))}
                    <option value="all" className="bg-slate-950 text-white font-black uppercase tracking-widest">
                      Grand Total (All)
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Total Points Distribution */}
                <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-3xl">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="bg-royal-gold/10 p-3 rounded-2xl border border-royal-gold/20">
                      <BarChart3 className="w-6 h-6 text-royal-gold" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Performance Distribution</h3>
                      <p className="text-lg font-black text-white tracking-tight">Top 10 Royal Students</p>
                    </div>
                  </div>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={allTimeStats.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', borderRadius: '2rem', border: '1px solid rgba(255,215,0,0.2)', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.8)' }}
                          itemStyle={{ color: '#FFD700', fontWeight: 900 }}
                          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        />
                        <Bar dataKey="totalPoints" radius={[12, 12, 0, 0]}>
                          {allTimeStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#FFD700' : index === 1 ? '#cbd5e1' : index === 2 ? '#b45309' : '#334155'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Daily Trends */}
                <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-3xl">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                      <TrendingUp className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Growth Insights</h3>
                      <p className="text-lg font-black text-white tracking-tight">Recent Activity Trends</p>
                    </div>
                  </div>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={Array.from({ length: 7 }).map((_, i) => {
                        const date = startOfDay(subDays(new Date(), 6 - i));
                        const points = data.points
                          .filter(p => isSameDay(safeParseISO(p.date), date))
                          .reduce((sum, p) => sum + p.points, 0);
                        return { date: format(date, "MMM dd"), points };
                      })}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 900 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', borderRadius: '2rem', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.8)' }}
                          itemStyle={{ color: '#10b981', fontWeight: 900 }}
                        />
                        <Line type="monotone" dataKey="points" stroke="#10b981" strokeWidth={4} dot={{ fill: '#10b981', r: 6, strokeWidth: 2, stroke: '#000' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "admin" && isAdmin && (
            <div className="space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-8 text-center sm:text-left">
                <div className="flex flex-col items-center sm:items-start">
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 uppercase whitespace-nowrap">STUDENT ROSTER</h2>
                  <p className="text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-[0.3em] mt-1">Manage Your Royal Academy</p>
                </div>
                <button 
                  onClick={() => setShowAddStudent(true)}
                  className="relative group overflow-hidden px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-2xl self-center sm:self-auto"
                >
                  <div className="absolute inset-0 bg-white opacity-90 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-3 text-black">
                    <UserPlus className="w-5 h-5" />
                    <span>ENROLL STUDENT</span>
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {data.students.map((student, index) => (
                  <motion.div 
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -10 }}
                    className="group bg-white/5 backdrop-blur-2xl border border-white/10 p-8 rounded-[3rem] hover:border-white/20 transition-all shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button 
                        onClick={() => setEditingStudent(student)}
                        className="p-3 bg-white/10 rounded-2xl text-white hover:bg-royal-gold hover:text-black transition-all shadow-xl backdrop-blur-md"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={async () => {
                          if (confirm(`Expel ${student.name}?`)) {
                            await fetch(`/api/students/${student.id}`, { method: "DELETE" });
                            fetchData();
                          }
                        }}
                        className="p-3 bg-white/10 rounded-2xl text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-xl backdrop-blur-md"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="flex flex-col items-center text-center relative z-10">
                      <div className="relative mb-6">
                        <div className="absolute -inset-1 bg-gradient-to-r from-royal-gold to-amber-600 rounded-[2rem] blur opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        <div className="relative w-32 h-32 rounded-[2rem] overflow-hidden border-2 border-white/10 bg-slate-900 group-hover:rotate-3 transition-all duration-500">
                          {student.photo ? (
                            <img src={student.photo} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-700">
                              <Users className="w-12 h-12" />
                            </div>
                          )}
                        </div>
                      </div>
                      <h3 className="font-black text-2xl text-white mb-2 uppercase tracking-tight group-hover:text-royal-gold transition-colors">{student.name}</h3>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-8">Member since {safeFormat(student.createdAt, "MMM yyyy")}</p>
                      
                      <button 
                        onClick={() => setShowAddPoints(student.id)}
                        className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs text-white hover:bg-royal-gold hover:text-black hover:border-transparent transition-all uppercase tracking-widest shadow-xl"
                      >
                        Award Points
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "gallery" && (
            <div className="space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 sm:gap-8 text-center sm:text-left">
                <div className="flex flex-col items-center sm:items-start">
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 uppercase whitespace-nowrap">ACADEMY GALLERY</h2>
                  <p className="text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-[0.3em] mt-1">Capturing Royal Moments</p>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => setShowAddGallery(true)}
                    className="relative group overflow-hidden px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-2xl self-center sm:self-auto"
                  >
                    <div className="absolute inset-0 royal-gradient-gold opacity-90 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center gap-3 text-black">
                      <Camera className="w-5 h-5" />
                      <span>ADD PHOTO</span>
                    </div>
                  </button>
                )}
              </div>

              {data.gallery && data.gallery.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[300px]">
                  {data.gallery.map((item, index) => item && (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "group relative rounded-[2rem] overflow-hidden border border-white/10 bg-slate-900 shadow-2xl",
                        index % 4 === 0 ? "lg:col-span-2 lg:row-span-2" : ""
                      )}
                    >
                      <img 
                        src={item.url} 
                        alt={item.caption} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div 
                        className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6 sm:p-8 cursor-pointer"
                        onClick={() => setSelectedGalleryIndex(index)}
                      >
                        <div className="transform translate-y-0 sm:translate-y-4 group-hover:translate-y-0 transition-all duration-500">
                          {item.caption && (
                            <h3 className="text-white font-black text-base sm:text-xl uppercase tracking-tight mb-2 leading-tight">
                              {item.caption}
                            </h3>
                          )}
                          <div className="flex items-center justify-between">
                            <p className="text-royal-gold text-[10px] font-black uppercase tracking-[0.3em]">
                              {safeFormat(item.createdAt, "MMM dd, yyyy")}
                            </p>
                            <div className="flex items-center gap-2 text-white/40 text-[10px] font-black uppercase tracking-widest sm:hidden group-hover:flex">
                              <span>View</span>
                              <ArrowDown className="w-3 h-3 -rotate-90" />
                            </div>
                          </div>
                        </div>
                        
                        {isAdmin && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteGallery(item.id);
                            }}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-3 bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl backdrop-blur-md transition-all border border-red-500/30 z-30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-32 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10 backdrop-blur-sm">
                  <div className="bg-white/5 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-3xl border border-white/10">
                    <ImageIcon className="w-12 h-12 text-slate-700" />
                  </div>
                  <p className="text-slate-500 font-black text-2xl uppercase tracking-[0.3em]">The gallery is currently empty</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "tender" && (
            <div className="space-y-12">
              {/* Tender Header */}
              <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-royal-gold/10 flex items-center justify-center border border-royal-gold/20 shadow-[0_0_40px_rgba(255,215,0,0.1)]">
                  <Gavel className="w-8 h-8 sm:w-10 sm:h-10 text-royal-gold" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase">Royal Tender</h2>
                <p className="text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em]">Question Bidding Activity</p>
              </div>

              {!isAdmin && (!joinedGroupId || !(tenderMode === 'individual' ? data.students : tenderGroups).some(x => x.id === joinedGroupId)) ? (
                <div className="max-w-md mx-auto space-y-8 bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-xl">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-royal-gold/10 flex items-center justify-center mx-auto border border-royal-gold/20">
                      <Key className="w-8 h-8 text-royal-gold" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                      {tenderMode === 'individual' ? 'Identify Yourself' : 'Enter Team Key'}
                    </h3>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                      {tenderMode === 'individual' 
                        ? 'Select your name to participate in the bidding'
                        : 'Ask your admin for the secret team key'}
                    </p>
                  </div>
                  
                  <div className="space-y-6">
                    {tenderMode === 'individual' ? (
                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {data.students.map(s => (
                          <button
                            key={s.id}
                            onClick={() => {
                              console.log("Selecting student ID:", s.id);
                              setJoinedGroupId(s.id);
                              localStorage.setItem('joinedGroupId', s.id);
                            }}
                            className="w-full text-left px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white font-bold hover:bg-royal-gold/20 hover:border-royal-gold/50 transition-all uppercase text-xs tracking-widest"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <>
                        <input 
                          type="text"
                          inputMode="numeric"
                          placeholder="ENTER PIN"
                          value={tenderGroupKey || ""}
                          onChange={(e) => setTenderGroupKey(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-8 py-6 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black text-3xl text-center tracking-[0.2em] placeholder:tracking-normal placeholder:text-slate-800"
                        />
                        <button 
                          onClick={() => {
                            const group = tenderGroups.find(g => g.key === tenderGroupKey);
                            if (group) {
                              setJoinedGroupId(group.id);
                              localStorage.setItem('joinedGroupId', group.id);
                            } else {
                              alert("Invalid Team Key");
                            }
                          }}
                          className="w-full royal-gradient-gold text-black py-5 rounded-2xl font-black shadow-2xl shadow-royal-gold/20 hover:scale-[1.02] transition-all tracking-[0.2em] uppercase"
                        >
                          JOIN ACTIVITY
                        </button>
                      </>
                    )}
                    <p className="text-center text-[9px] font-black text-slate-600 uppercase tracking-widest">Only your progress will be visible</p>
                  </div>
                </div>
              ) : (
                <>
                {/* Admin and Joined Student UI */}
                {(isAdmin || (joinedGroupId && (tenderMode === 'individual' ? data.students : tenderGroups).some(x => x.id === joinedGroupId))) && (
                  <>
                  {!isAdmin && (
                    <div className="flex justify-center mb-8">
                       <button
                        onClick={() => {
                          setJoinedGroupId(null);
                          localStorage.removeItem('joinedGroupId');
                        }}
                        className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:bg-white/10"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Changing {tenderMode === 'individual' ? 'Identity' : 'Team'}
                      </button>
                    </div>
                  )}
                  {/* Phase 0: Setup */}
                  {tenderPhase === 'setup' && (
                    isAdmin ? (
                      <div className="max-w-4xl mx-auto space-y-12">
                        {!(firebaseUser?.email === "stephenludia@gmail.com") && (
                          <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex items-center gap-4 text-amber-500">
                            <Lock className="w-6 h-6 shrink-0" />
                            <div className="text-xs font-black uppercase tracking-widest">
                              <p>Tender Cloud Sync is inactive.</p>
                              <button 
                                onClick={handleGoogleLogin} 
                                disabled={isSigningIn}
                                className="underline hover:text-white disabled:opacity-50"
                              >
                                {isSigningIn ? "SIGNING IN..." : "Sign in with Google as stephenludia@gmail.com"}
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Mode Selection */}
                          <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Activity Mode</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <button 
                                onClick={() => setTenderMode('individual')}
                                className={cn(
                                  "py-6 rounded-2xl border transition-all flex flex-col items-center gap-3",
                                  tenderMode === 'individual' 
                                    ? "bg-royal-gold/20 border-royal-gold text-royal-gold" 
                                    : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"
                                )}
                              >
                                <Users className="w-8 h-8" />
                                <span className="font-black text-xs uppercase tracking-widest">Individual</span>
                              </button>
                              <button 
                                onClick={() => setTenderMode('group')}
                                className={cn(
                                  "py-6 rounded-2xl border transition-all flex flex-col items-center gap-3",
                                  tenderMode === 'group' 
                                    ? "bg-royal-gold/20 border-royal-gold text-royal-gold" 
                                    : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"
                                )}
                              >
                                <UserPlus className="w-8 h-8" />
                                <span className="font-black text-xs uppercase tracking-widest">Group</span>
                              </button>
                            </div>
                          </div>

                          {/* Starting Points */}
                          <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Starting Points</h3>
                            <div className="flex items-center gap-6">
                              <input 
                                type="number"
                                value={startingPoints ?? 100}
                                onChange={(e) => setStartingPoints(parseInt(e.target.value) || 0)}
                                className="w-full px-8 py-6 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black text-2xl sm:text-4xl text-center"
                              />
                            </div>
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest text-center">Initial balance for each player/team</p>
                          </div>
                      </div>

                      {/* Group Management (only if group mode) */}
                      {tenderMode === 'group' && (
                        <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-8">
                          <div className="space-y-6">
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Manage Teams</h3>
                            <button 
                              onClick={() => setEditingGroup({ 
                                id: Math.random().toString(36).substr(2, 9), 
                                name: `Team ${tenderGroups.length + 1}`, 
                                studentIds: [],
                                key: "" 
                              })}
                              className="px-6 py-3 royal-gradient-gold rounded-xl text-black font-black text-xs uppercase tracking-widest flex items-center gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Team
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {tenderGroups.map(group => (
                              <div key={group.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <span className="text-[10px] font-black text-royal-gold uppercase tracking-widest bg-black/50 px-2 py-1 rounded-lg border border-royal-gold/20">
                                      Key: {group.key || 'None'}
                                   </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-black text-white uppercase tracking-tight">{group.name}</h4>
                                    <p className="text-[8px] font-black text-royal-gold uppercase tracking-widest mt-1">Key: {group.key || 'Not Set'}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => setEditingGroup(group)} className="p-2 text-slate-500 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => deleteDoc(doc(db, "tender_groups", group.id))} className="p-2 text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {group.studentIds.map(sid => {
                                    const student = data.students.find(s => s.id === sid);
                                    return (
                                      <span key={sid} className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-slate-400 font-bold">
                                        {student?.name}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-center pt-8">
                        <button 
                          onClick={async () => {
                            const balances: Record<string, number> = {};
                            const batch = writeBatch(db);
                            
                            if (tenderMode === 'individual') {
                              data.students.forEach(s => balances[s.id] = startingPoints);
                            } else {
                              tenderGroups.forEach(g => balances[g.id] = startingPoints);
                            }

                            // Write to Firebase
                            Object.entries(balances).forEach(([id, balance]) => {
                              batch.set(doc(db, "tender_balances", id), { balance: balance ?? 100 });
                            });

                            batch.set(doc(db, "tender_session", "current"), {
                              phase: 'bidding',
                              mode: tenderMode,
                              startingPoints,
                              activeBidderId: null,
                              turnIndex: 0,
                              resultsVisible: false,
                              settlementVisible: false,
                              updatedAt: serverTimestamp()
                            });

                            await batch.commit();
                          }}
                          disabled={tenderMode === 'group' && tenderGroups.length === 0}
                          className="px-16 py-6 royal-gradient-gold rounded-[2rem] text-black font-black text-xl uppercase tracking-[0.2em] shadow-2xl hover:scale-105 transition-all disabled:opacity-50"
                        >
                          Start Activity
                        </button>
                      </div>
                    </div>
                    ) : (
                      <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-white/10 backdrop-blur-xl">
                        <div className="w-20 h-20 rounded-2xl bg-royal-gold/10 flex items-center justify-center mx-auto mb-6 border border-royal-gold/20 animate-pulse">
                          <Gavel className="w-10 h-10 text-royal-gold" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Active Session</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Waiting for the Royal Admin to launch the tender...</p>
                      </div>
                    )
                  )}

              {/* Phase 1: Bidding */}
              {tenderPhase === 'bidding' && (
                <div className="space-y-12">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                    {(tenderMode === 'individual' ? data.students : tenderGroups)
                      .filter(item => isAdmin || item.id === joinedGroupId)
                      .map((item) => {
                      const id = item.id;
                      const hasBidded = tenderBids.some(b => (tenderMode === 'individual' ? b.studentId : b.groupId) === id);
                      const balance = tenderSessionBalances[id] || 0;
                      
                      return (
                        <motion.button
                          key={id}
                          whileHover={!hasBidded ? { scale: 1.05 } : {}}
                          whileTap={!hasBidded ? { scale: 0.95 } : {}}
                          onClick={() => !hasBidded && (isAdmin || id === joinedGroupId) && setActiveBidderId(id)}
                          disabled={hasBidded || (!isAdmin && id !== joinedGroupId)}
                          className={cn(
                            "relative group flex flex-col items-center p-4 rounded-[2rem] border transition-all duration-500",
                            hasBidded || (!isAdmin && id !== joinedGroupId)
                              ? "bg-white/5 border-white/5 opacity-30 grayscale" 
                              : "bg-white/5 border-white/10 hover:border-royal-gold/50 hover:bg-white/10 shadow-xl"
                          )}
                        >
                          <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 border border-white/10">
                            {tenderMode === 'individual' ? (
                              (item as Student).photo ? (
                                <img src={(item as Student).photo!} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                                  <Users className="w-8 h-8" />
                                </div>
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-royal-gold/10 text-royal-gold">
                                <UserPlus className="w-12 h-12" />
                              </div>
                            )}
                            {hasBidded && (
                              <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center">
                                <Lock className="w-6 h-6 text-white/50" />
                              </div>
                            )}
                          </div>
                          <span className={cn(
                            "font-black text-[10px] sm:text-xs uppercase tracking-widest text-center",
                            hasBidded ? "text-slate-600" : "text-white group-hover:text-royal-gold"
                          )}>
                            {item.name}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col items-center gap-8 pt-8 border-t border-white/5">
                    {!isAdmin && (
                      <button
                        onClick={() => {
                          setJoinedGroupId(null);
                          localStorage.removeItem('joinedGroupId');
                        }}
                        className="text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-3 h-3" />
                        Exit {tenderMode === 'individual' ? 'Identity' : 'Team'}
                      </button>
                    )}
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">
                        {tenderBids.length} of {tenderMode === 'individual' ? data.students.length : tenderGroups.length} Bids Collected
                      </p>
                      <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full royal-gradient-gold"
                          initial={{ width: 0 }}
                          animate={{ width: `${(tenderBids.length / (tenderMode === 'individual' ? data.students.length : tenderGroups.length)) * 100}%` }}
                        />
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex flex-wrap justify-center gap-4 w-full px-4 sm:px-0">
                        <button 
                          onClick={() => setShowResetConfirm(true)}
                          className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest hover:text-red-400 transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Reset Round
                        </button>
                        <button 
                          onClick={() => updateDoc(doc(db, "tender_session", "current"), { phase: 'reveal' })}
                          disabled={tenderBids.length === 0}
                          className="px-12 py-4 royal-gradient-gold rounded-2xl text-black font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale"
                        >
                          Reveal Results
                        </button>
                        <button 
                          onClick={() => updateDoc(doc(db, "tender_session", "current"), { phase: 'settlement' })}
                          className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-royal-gold font-black text-[10px] uppercase tracking-widest hover:bg-royal-gold/10 transition-all flex items-center justify-center gap-2"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          Final Settlement
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bid Entry Modal */}
              <AnimatePresence>
                {activeBidderId && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
                      onClick={() => setActiveBidderId(null)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-12 shadow-3xl overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 royal-gradient-gold opacity-50" />
                      
                      <div className="flex flex-col items-center text-center space-y-8">
                        {(() => {
                          const item = tenderMode === 'individual' 
                            ? data.students.find(s => s.id === activeBidderId)
                            : tenderGroups.find(g => g.id === activeBidderId);
                          
                          return (
                            <>
                              <div className="space-y-4">
                                <div className="w-24 h-24 rounded-3xl border-2 border-royal-gold/30 overflow-hidden mx-auto">
                                  {tenderMode === 'individual' ? (
                                    (item as Student)?.photo ? (
                                      <img src={(item as Student).photo!} alt={item?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600">
                                        <Users className="w-10 h-10" />
                                      </div>
                                    )
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-royal-gold/10 text-royal-gold">
                                      <UserPlus className="w-12 h-12" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-2xl font-black text-white uppercase tracking-tight">{item?.name}</h3>
                                  <p className="text-royal-gold text-[10px] font-black uppercase tracking-[0.3em]">Place your secret bid</p>
                                </div>
                              </div>

                              <div className="w-full space-y-4 sm:space-y-6">
                                <input 
                                  autoFocus
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={currentBidPoints || ""}
                                  onChange={(e) => setCurrentBidPoints(e.target.value)}
                                  className="w-full px-4 sm:px-8 py-4 sm:py-6 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black text-3xl sm:text-5xl text-center placeholder:text-slate-800"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                  <button 
                                    onClick={() => {
                                      setActiveBidderId(null);
                                      setCurrentBidPoints("");
                                    }}
                                    className="py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-slate-500 text-xs uppercase tracking-widest hover:text-white transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (!activeBidderId || !currentBidPoints || isSubmittingBid) return;
                                      const points = parseFloat(currentBidPoints);
                                      if (isNaN(points)) return;
                                      
                                      setIsSubmittingBid(true);
                                      const bidRef = doc(db, "tender_bids", activeBidderId);
                                      const bidder = (tenderMode === 'individual' ? data.students : tenderGroups).find(x => x.id === activeBidderId);
                                      
                                      try {
                                        await setDoc(bidRef, {
                                          bidderId: activeBidderId,
                                          points,
                                          bidderName: bidder?.name || "Unknown",
                                          timestamp: serverTimestamp()
                                        });
                                        setActiveBidderId(null);
                                        setCurrentBidPoints("");
                                      } catch (err: any) {
                                        console.error("Bid Submission Error:", err);
                                        alert(`Submission Failed: ${err.message || 'Check your connection and try again.'}`);
                                      } finally {
                                        setIsSubmittingBid(false);
                                      }
                                    }}
                                    disabled={isSubmittingBid}
                                    className="py-4 royal-gradient-gold rounded-2xl font-black text-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                  >
                                    {isSubmittingBid ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : null}
                                    {isSubmittingBid ? "Submitting..." : "Submit Bid"}
                                  </button>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Secure Reset Modal */}
              <AnimatePresence>
                {showResetConfirm && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl"
                      onClick={() => {
                        setShowResetConfirm(false);
                        setResetPassword("");
                      }}
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative w-full max-w-sm bg-slate-900 border border-red-500/20 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-3xl text-center space-y-6 sm:space-y-8"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                        <Lock className="w-8 h-8" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Security Check</h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Enter Admin Password to Reset Round</p>
                      </div>
                      <input 
                        autoFocus
                        type="password"
                        placeholder="••••••••"
                        value={resetPassword || ""}
                        onChange={(e) => setResetPassword(e.target.value)}
                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none text-white font-black text-center tracking-[0.5em]"
                      />
                      <div className="flex gap-4">
                        <button 
                          onClick={() => {
                            setShowResetConfirm(false);
                            setResetPassword("");
                          }}
                          className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-slate-500 text-[10px] uppercase tracking-widest"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/login", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ password: resetPassword }),
                              });
                              
                              if (res.ok) {
                                try {
                                  const batch = writeBatch(db);
                                  const bidsSnap = await getDocs(collection(db, "tender_bids"));
                                  bidsSnap.forEach(d => batch.delete(d.ref));
                                  batch.update(doc(db, "tender_session", "current"), { turnIndex: 0, updatedAt: serverTimestamp() });
                                  await batch.commit();
                                  setShowResetConfirm(false);
                                  setResetPassword("");
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.WRITE, "reset_round");
                                }
                              } else {
                                alert("Incorrect Password");
                              }
                            } catch (err) {
                              alert("Verification failed");
                            }
                          }}
                          className="flex-1 py-4 bg-red-500 rounded-2xl font-black text-white text-[10px] uppercase tracking-widest shadow-xl shadow-red-500/20"
                        >
                          Confirm Reset
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Celebration Animation */}
              <AnimatePresence>
                {showCelebration && (
                  <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden pointer-events-none">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                    />
                    
                    {/* Sparkles/Particles */}
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ 
                          x: 0, 
                          y: 0, 
                          scale: 0,
                          rotate: 0 
                        }}
                        animate={{ 
                          x: (Math.random() - 0.5) * 1000, 
                          y: (Math.random() - 0.5) * 1000, 
                          scale: [0, 1.5, 0],
                          rotate: Math.random() * 360 
                        }}
                        transition={{ 
                          duration: 2.5, 
                          ease: "easeOut",
                          delay: Math.random() * 0.5
                        }}
                        className="absolute"
                      >
                        <Sparkles className="w-8 h-8 text-royal-gold" />
                      </motion.div>
                    ))}

                    <motion.div 
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="relative bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] sm:rounded-[4rem] p-8 sm:p-20 shadow-[0_0_100px_rgba(255,215,0,0.3)] text-center space-y-6 sm:space-y-8 mx-4"
                    >
                      <motion.div
                        animate={{ 
                          scale: [1, 1.2, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-24 h-24 sm:w-48 sm:h-48 rounded-3xl sm:rounded-[3rem] bg-royal-gold flex items-center justify-center mx-auto shadow-2xl"
                      >
                        <Crown className="w-12 h-12 sm:w-24 sm:h-24 text-black" />
                      </motion.div>
                      
                      <div className="space-y-2 sm:space-y-4">
                        <h2 className="text-3xl sm:text-6xl font-black text-white uppercase tracking-tighter">
                          {showCelebration.studentName}
                        </h2>
                        <div className="flex items-center justify-center gap-2 sm:gap-4">
                          <Coins className="w-6 h-6 sm:w-8 h-8 text-royal-gold" />
                          <span className="text-4xl sm:text-7xl font-black text-royal-gold font-mono">
                            +{showCelebration.points}
                          </span>
                        </div>
                        <p className="text-royal-gold font-black text-[10px] sm:text-lg uppercase tracking-[0.3em] sm:tracking-[0.5em] animate-pulse">
                          ROYAL VICTORY
                        </p>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Phase 2: Reveal */}
              {tenderPhase === 'reveal' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-2xl mx-auto space-y-8"
                >
                  {(!isAdmin && !tenderResultsVisible) ? (
                    <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 p-20 text-center space-y-8">
                       <div className="w-20 h-20 rounded-3xl bg-royal-gold/10 flex items-center justify-center mx-auto animate-pulse">
                        <Lock className="w-10 h-10 text-royal-gold" />
                      </div>
                      <div className="space-y-4">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Revealing Results...</h3>
                        <p className="text-slate-500 font-black uppercase text-[10px] tracking-[0.3em]">Wait for the Royal Admin to unveil the bids</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden">
                      <div className="p-8 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <h3 className="text-xl font-black text-white uppercase tracking-widest">Bidding Results</h3>
                        {isAdmin && (
                          <button 
                            onClick={() => updateDoc(doc(db, "tender_session", "current"), { resultsVisible: !tenderResultsVisible })}
                            className={cn(
                              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              tenderResultsVisible ? "bg-emerald-500/20 text-emerald-500" : "bg-white/5 text-slate-500"
                            )}
                          >
                            {tenderResultsVisible ? "Visible to Students" : "Hidden from Students"}
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-white/5">
                        {(() => {
                          const sortedBids = [...tenderBids].sort((a, b) => (b.points - a.points) || (a.timestamp?.seconds - b.timestamp?.seconds));
                          return sortedBids
                            .filter((bid, index) => 
                              isAdmin || 
                              tenderResultsVisible || 
                              (tenderMode === 'individual' ? bid.studentId : bid.groupId) === joinedGroupId
                            )
                            .map((bid) => {
                              const id = tenderMode === 'individual' ? bid.studentId : bid.groupId;
                              const item = tenderMode === 'individual' 
                                ? data.students.find(s => s.id === id)
                                : tenderGroups.find(g => g.id === id);
                              
                              const index = sortedBids.findIndex(b => b === bid);
                              const isMe = id === joinedGroupId;
                              const isWinner = index === 0;

                              return (
                                <div key={id} className={cn(
                                  "flex items-center justify-between p-6 transition-all",
                                  isWinner && (isAdmin || isMe) ? "bg-royal-gold/10" : ""
                                )}>
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm",
                                      isWinner ? "royal-gradient-gold text-black" : "bg-white/5 text-slate-400"
                                    )}>
                                      {index + 1}
                                    </div>
                                    <div>
                                      <p className="font-black text-white uppercase tracking-tight">{item?.name}</p>
                                      {isWinner && <p className="text-[10px] font-black text-royal-gold uppercase tracking-widest">Top Bidder</p>}
                                      {isMe && !isWinner && <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Bid</p>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={cn(
                                      "text-2xl font-black font-mono",
                                      isWinner ? "text-royal-gold" : "text-white"
                                    )}>{bid.points}</p>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Points Bid</p>
                                  </div>
                                </div>
                              );
                            });
                        })()}
                        {!isAdmin && (tenderResultsVisible || tenderBids.some(bid => (tenderMode === 'individual' ? bid.studentId : bid.groupId) === joinedGroupId)) === false && (
                          <div className="p-12 text-center">
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No local bid found.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <button 
                        onClick={() => updateDoc(doc(db, "tender_session", "current"), { phase: 'bidding', resultsVisible: false })}
                        className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 font-black text-sm uppercase tracking-widest hover:text-white transition-all order-2 sm:order-1"
                      >
                        Back to Bidding
                      </button>
                      <button 
                        onClick={() => updateDoc(doc(db, "tender_session", "current"), { phase: 'action', turnIndex: 0 })}
                        className="w-full sm:w-auto px-12 py-4 royal-gradient-gold rounded-2xl text-black font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-all order-1 sm:order-2"
                      >
                        Process Tender
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Phase 3: Action */}
              {tenderPhase === 'action' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-xl mx-auto space-y-12 text-center"
                >
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={tenderTurnIndex}
                    initial={{ opacity: 0, scale: 0.8, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.2, y: -30, filter: "blur(10px)" }}
                    transition={{ type: "spring", damping: 12, stiffness: 100 }}
                    className="space-y-8"
                  >
                    <p className="text-slate-500 font-black uppercase tracking-[0.4em]">Current Bidder</p>
                    {(() => {
                      const sortedBids = [...tenderBids].sort((a, b) => b.points - a.points);
                      const currentBid = sortedBids[tenderTurnIndex];
                      if (!currentBid) return null;

                      const id = tenderMode === 'individual' ? currentBid.studentId : currentBid.groupId;
                      const item = tenderMode === 'individual' 
                        ? data.students.find(s => s.id === id)
                        : tenderGroups.find(g => g.id === id);
                      
                      const isMe = id === joinedGroupId;
                      const isMyTurn = isMe;

                      if (!isAdmin && !isMyTurn) {
                        return (
                          <div className="py-20 space-y-10">
                            <div className="relative">
                              <div className="w-32 h-32 rounded-[3rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto animate-pulse">
                                <Clock className="w-12 h-12 text-slate-800" />
                              </div>
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-2 border-dashed border-slate-800 rounded-[3rem] scale-110"
                              />
                            </div>
                            <div className="space-y-4">
                              <p className="text-slate-600 font-black uppercase tracking-[0.4em] text-xs">Waiting for Your Turn</p>
                              <p className="text-white font-black text-2xl uppercase tracking-tighter">
                                {item?.name} is Answering
                              </p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="flex flex-col items-center space-y-4 sm:space-y-6">
                           <motion.div 
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="bg-royal-gold/10 px-6 py-2 rounded-full border border-royal-gold/20 mb-4"
                          >
                            <p className="text-royal-gold font-black uppercase text-[10px] tracking-[0.3em]">
                              {isAdmin ? "Admin Evaluation" : "Your Chance to Answer!"}
                            </p>
                          </motion.div>
                          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl sm:rounded-[2.5rem] border-4 border-royal-gold overflow-hidden shadow-[0_0_50px_rgba(255,215,0,0.2)]">
                            {tenderMode === 'individual' ? (
                              (item as Student)?.photo ? (
                                <img src={(item as Student).photo!} alt={item?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                                  <Users className="w-12 h-12 sm:w-16 sm:h-16" />
                                </div>
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-royal-gold/10 text-royal-gold">
                                <UserPlus className="w-12 h-12 sm:w-16 sm:h-16" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tighter">{item?.name}</h3>
                            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4">
                              <div className="flex gap-1.5">
                                {tenderBids.map((_, i) => (
                                  <div 
                                    key={i} 
                                    className={cn(
                                      "h-1.5 rounded-full transition-all duration-500",
                                      i === tenderTurnIndex ? "w-8 bg-royal-gold shadow-[0_0_10px_rgba(255,215,0,0.5)]" : i < tenderTurnIndex ? "w-3 bg-slate-700" : "w-3 bg-slate-800"
                                    )} 
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-center gap-2 sm:gap-3 mt-6">
                              <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-royal-gold" />
                              <motion.span 
                                animate={isMyTurn ? { 
                                  scale: [1, 1.1, 1],
                                  color: ["#FFD700", "#FFFFFF", "#FFD700"]
                                } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-2xl sm:text-4xl font-black text-royal-gold font-mono"
                              >
                                {currentBid.points}
                              </motion.span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
 
                  {isAdmin && (
                    <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <button 
                        onClick={async () => {
                          const sortedBids = [...tenderBids].sort((a, b) => (b.points - a.points) || (a.timestamp?.seconds - b.timestamp?.seconds));
                          const topBid = sortedBids[tenderTurnIndex];
                          const others = sortedBids.filter((_, idx) => idx !== tenderTurnIndex);
                          
                          const topId = tenderMode === 'individual' ? topBid.studentId : topBid.groupId;
                          const item = (tenderMode === 'individual' ? data.students : tenderGroups).find(x => x.id === topId);
                          
                          // Local animation
                          setShowCelebration({ studentName: item?.name || "Winner", points: topBid.points });
                          
                          // Update Balances locally to calculate
                          const newBalances = { ...tenderSessionBalances };
                          if (topId) newBalances[topId] = (newBalances[topId] || 0) + topBid.points;
                          
                          // Only reduce points for those who haven't had a chance yet
                          const remainingBidders = sortedBids.filter((_, idx) => idx > tenderTurnIndex);
                          remainingBidders.forEach(b => {
                            const id = tenderMode === 'individual' ? b.studentId : b.groupId;
                            if (id) newBalances[id] = (newBalances[id] || 0) - b.points;
                          });

                          // Write to Firebase
                          const batch = writeBatch(db);
                          Object.entries(newBalances).forEach(([id, balance]) => {
                            if (balance !== undefined) {
                              batch.set(doc(db, "tender_balances", id), { balance: Number(balance) || 0 });
                            }
                          });

                          // Clear bids
                          const bidDocs = await getDocs(collection(db, "tender_bids"));
                          bidDocs.forEach(d => batch.delete(d.ref));

                          batch.update(doc(db, "tender_session", "current"), {
                            phase: 'bidding',
                            turnIndex: 0,
                            updatedAt: serverTimestamp()
                          });

                          await batch.commit();
    
                          // Wait for animation to finish locally
                          setTimeout(() => {
                            setShowCelebration(null);
                          }, 3000);
                        }}
                        className="group relative overflow-hidden py-4 sm:py-10 rounded-[2rem] sm:rounded-[2.5rem] border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all"
                      >
                        <div className="relative z-10 flex flex-col items-center gap-1 sm:gap-3">
                          <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                            <Sparkles className="w-5 h-5 sm:w-8 sm:h-8" />
                          </div>
                          <span className="font-black text-emerald-500 text-[10px] sm:text-base uppercase tracking-[0.2em]">Correct</span>
                        </div>
                      </button>
    
                      <button 
                        onClick={async () => {
                          const sortedBids = [...tenderBids].sort((a, b) => (b.points - a.points) || (a.timestamp?.seconds - b.timestamp?.seconds));
                          
                          // Current person lose their marks immediately
                          const currentBid = sortedBids[tenderTurnIndex];
                          const currentId = tenderMode === 'individual' ? currentBid.studentId : currentBid.groupId;

                          const newBalances = { ...tenderSessionBalances };
                          if (currentId) newBalances[currentId] = (newBalances[currentId] || 0) - currentBid.points;

                          const batch = writeBatch(db);
                          Object.entries(newBalances).forEach(([id, balance]) => {
                            if (balance !== undefined) {
                              batch.set(doc(db, "tender_balances", id), { balance: Number(balance) || 0 });
                            }
                          });

                          if (tenderTurnIndex < sortedBids.length - 1) {
                            // Next person gets a chance
                            batch.update(doc(db, "tender_session", "current"), { turnIndex: tenderTurnIndex + 1 });
                          } else {
                            // All wrong, session goes back to bidding
                            // Clear bids
                            const bidDocs = await getDocs(collection(db, "tender_bids"));
                            bidDocs.forEach(d => batch.delete(d.ref));

                            batch.update(doc(db, "tender_session", "current"), {
                              phase: 'bidding',
                              turnIndex: 0,
                              updatedAt: serverTimestamp()
                            });
                          }
                          await batch.commit();
                        }}
                        className="group relative overflow-hidden py-4 sm:py-10 rounded-[2rem] sm:rounded-[2.5rem] border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all"
                      >
                        <div className="relative z-10 flex flex-col items-center gap-1 sm:gap-3">
                          <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                            <X className="w-5 h-5 sm:w-8 sm:h-8" />
                          </div>
                          <span className="font-black text-red-500 text-[10px] sm:text-base uppercase tracking-[0.2em]">
                            {tenderTurnIndex < tenderBids.length - 1 ? "Wrong (Next Bidder)" : "All Wrong"}
                          </span>
                        </div>
                      </button>
                    </div>

                    <button 
                      onClick={() => {
                        updateDoc(doc(db, "tender_session", "current"), { phase: 'reveal', turnIndex: 0 });
                      }}
                      className="text-slate-500 hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors space-y-8 mt-8"
                    >
                      Cancel and go back
                    </button>
                    </>
                  )}
                </motion.div>
              )}

              {/* Phase 4: Settlement */}
              {tenderPhase === 'settlement' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="max-w-4xl mx-auto space-y-8"
                >
                  <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-3xl overflow-hidden">
                    <div className="p-6 sm:p-8 border-b border-white/5 bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-widest text-center sm:text-left">Final Settlement</h3>
                      {isAdmin && (
                         <button 
                            onClick={async () => {
                            try {
                              await updateDoc(doc(db, "tender_session", "current"), { settlementVisible: !tenderSettlementVisible });
                            } catch (err) {
                              handleFirestoreError(err, OperationType.UPDATE, "tender_session/current");
                            }
                          }}
                            className={cn(
                              "w-full sm:w-auto px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              tenderSettlementVisible ? "bg-emerald-500/20 text-emerald-500" : "bg-white/5 text-slate-500"
                            )}
                          >
                            {tenderSettlementVisible ? "Shown to Students" : "Show Scores to Students"}
                          </button>
                      )}
                    </div>
                    
                    <div className="p-6 sm:p-20">
                      {(!isAdmin && !tenderSettlementVisible) ? (
                        <div className="py-20 text-center space-y-10">
                           <div className="relative mx-auto w-32 h-32">
                              <Trophy className="w-20 h-20 text-royal-gold mx-auto animate-bounce relative z-10" />
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="absolute inset-0 border-4 border-dashed border-royal-gold/20 rounded-full"
                              />
                           </div>
                           <div className="space-y-4">
                             <h4 className="text-2xl font-black text-white uppercase tracking-[0.2em]">Calculating Royal Scores</h4>
                             <p className="text-slate-500 font-bold uppercase text-xs tracking-[0.4em]">The Crown is evaluating your efforts...</p>
                           </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-8">
                          {(tenderMode === 'individual' ? data.students : tenderGroups)
                            .filter(item => isAdmin || item.id === joinedGroupId)
                            .map((item) => {
                            const balance = tenderSessionBalances[item.id] || 0;
                            const isPositive = balance >= 0;
                            
                            return (
                              <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={item.id} 
                                className={cn(
                                  "w-full max-w-2xl bg-white/5 border border-white/10 rounded-[3rem] p-10 sm:p-16 flex flex-col items-center text-center gap-10 transition-all",
                                  !isAdmin ? "border-royal-gold/40 bg-royal-gold/5 shadow-[0_0_100px_rgba(255,215,0,0.1)]" : ""
                                )}
                              >
                                <div className="space-y-6">
                                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-[2.5rem] bg-slate-900 border-4 border-white/10 overflow-hidden shadow-2xl mx-auto">
                                    {tenderMode === 'individual' ? (
                                      (item as Student).photo ? (
                                        <img src={(item as Student).photo!} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                                          <Users className="w-16 h-16" />
                                        </div>
                                      )
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-royal-gold/10 text-royal-gold">
                                        <UserPlus className="w-16 h-16" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <h4 className="text-royal-gold font-black uppercase text-xs tracking-[0.5em]">Final Performance</h4>
                                    <p className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">{item.name}</p>
                                  </div>
                                </div>

                                <div className="p-8 sm:p-12 rounded-[2rem] bg-white/5 border border-white/5 w-full">
                                  <p className={cn(
                                    "text-6xl sm:text-8xl font-black font-mono tracking-tighter",
                                    isPositive ? "text-emerald-400" : "text-red-400"
                                  )}>
                                    {isPositive ? '+' : ''}{balance}
                                  </p>
                                  <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] sm:text-xs mt-4">Reward Points Earned</p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                      <button 
                         onClick={async () => {
                          const pointsToSubmit: any[] = [];
                          const date = new Date().toISOString();
                          
                          Object.entries(tenderSessionBalances).forEach(([id, balance]) => {
                            if (balance === 0) return;
                            if (tenderMode === 'individual') {
                              pointsToSubmit.push({
                                studentId: id,
                                points: Number(balance),
                                description: "Royal Tender Result",
                                date: date
                              });
                            } else {
                              const group = tenderGroups.find(g => g.id === id);
                              if (group) {
                                group.studentIds.forEach(sid => {
                                  pointsToSubmit.push({
                                    studentId: sid,
                                    points: Number(balance),
                                    description: `Team Tender: ${group.name}`,
                                    date: date
                                  });
                                });
                              }
                            }
                          });

                          if (pointsToSubmit.length > 0) {
                            try {
                              const res = await fetch("/api/points/bulk", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ points: pointsToSubmit })
                              });
                              if (!res.ok) throw new Error("Failed to submit points to server");
                            } catch (err) {
                              console.error("Bulk submission error:", err);
                              alert("Failed to submit scores to the main ledger. Please try again.");
                              return;
                            }
                          }

                          try {
                            // Cleanup Firebase and transition state
                            const batch = writeBatch(db);
                            const bidDocs = await getDocs(collection(db, "tender_bids"));
                            bidDocs.forEach(d => batch.delete(d.ref));
                            const balanceDocs = await getDocs(collection(db, "tender_balances"));
                            balanceDocs.forEach(d => batch.delete(d.ref));
                            
                            batch.update(doc(db, "tender_session", "current"), { 
                              phase: 'setup', 
                              resultsVisible: false, 
                              settlementVisible: false, 
                              updatedAt: serverTimestamp() 
                            });
                            
                            await batch.commit();
                            await fetchData(); // Refresh local rankings
                          } catch (err) {
                            handleFirestoreError(err, OperationType.WRITE, "bulk_finish");
                          }
                        }}
                        className="w-full sm:w-auto px-12 py-6 royal-gradient-gold text-black font-black text-lg uppercase tracking-[0.2em] rounded-[2rem] hover:scale-105 transition-all shadow-3xl shadow-royal-gold/20"
                      >
                        Submit All Scores
                      </button>
                      <button 
                        onClick={() => updateDoc(doc(db, "tender_session", "current"), { phase: 'reveal' })}
                        className="w-full sm:w-auto px-10 py-6 bg-white/5 border border-white/10 rounded-[2rem] text-slate-400 font-black text-sm uppercase tracking-widest hover:text-white transition-all"
                      >
                        Back to Results
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
              </>
              )}
              </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudentId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" 
              onClick={() => setSelectedStudentId(null)} 
            />
            {(() => {
              const student = allTimeStats.find(s => s.id === selectedStudentId);
              if (!student) return null;
              const rank = allTimeStats.findIndex(s => s.id === selectedStudentId) + 1;
              
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative bg-slate-950 w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-[2rem] sm:rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(255,215,0,0.1)] border border-white/10 flex flex-col md:flex-row"
                >
                  {/* Left Side: Profile Info */}
                  <div className="w-full md:w-2/5 royal-gradient-purple p-4 sm:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden flex-shrink-0">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                      <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] border-[20px] border-white rounded-full" />
                    </div>
                    
                    <div className="relative mb-3 sm:mb-8">
                      <div className="absolute -inset-2 bg-royal-gold/20 blur-2xl rounded-full animate-pulse"></div>
                      <div className="relative w-20 h-20 sm:w-40 sm:h-40 rounded-[1.2rem] sm:rounded-[2.5rem] border-4 border-royal-gold/50 overflow-hidden bg-slate-900 shadow-2xl rotate-3">
                        {student.photo ? (
                          <img src={student.photo} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20">
                            <Users className="w-10 h-10 sm:w-16 sm:h-16" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 sm:-bottom-4 -right-4 royal-gradient-gold text-black w-8 h-8 sm:w-14 sm:h-14 rounded-lg sm:rounded-2xl flex items-center justify-center font-black text-sm sm:text-2xl shadow-2xl border-2 border-white/20">
                        #{rank}
                      </div>
                    </div>
                    
                    <h2 className="text-xl sm:text-3xl font-black text-white tracking-tighter mb-0.5 sm:mb-2 uppercase">{student.name}</h2>
                    
                    <div className="mb-4 text-center">
                      <select
                        value={selectedAcademicYear}
                        onChange={(e) => setSelectedAcademicYear(e.target.value)}
                        className="bg-black/30 backdrop-blur-xl text-royal-gold text-[8px] sm:text-[10px] font-black px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl uppercase tracking-widest border border-royal-gold/20 outline-none cursor-pointer"
                      >
                        {academicYears.map((ay) => (
                          <option key={ay} value={ay} className="bg-slate-950 text-white font-black uppercase tracking-widest">
                            Cycle {ay}
                          </option>
                        ))}
                        <option value="all" className="bg-slate-950 text-white font-black uppercase tracking-widest">
                          Grand Total (All)
                        </option>
                      </select>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2 mb-3 sm:mb-8">
                      {getBadge(student.totalPoints) && (
                        <span className="bg-white/10 text-royal-gold text-[7px] sm:text-[10px] font-black px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl uppercase tracking-widest border border-royal-gold/20 backdrop-blur-md">
                          {getBadge(student.totalPoints)}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full max-w-[280px] sm:max-w-none">
                      <div className="bg-black/30 backdrop-blur-xl p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
                        <p className="text-[7px] sm:text-[10px] text-royal-gold font-black uppercase tracking-widest mb-0.5 sm:mb-1">Total</p>
                        <p className="text-lg sm:text-2xl font-black text-white">{student.totalPoints}</p>
                      </div>
                      <div className="bg-black/30 backdrop-blur-xl p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
                        <p className="text-[7px] sm:text-[10px] text-emerald-400 font-black uppercase tracking-widest mb-0.5 sm:mb-1">Today</p>
                        <p className="text-lg sm:text-2xl font-black text-white">+{student.dailyPoints}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: History */}
                  <div className="flex-1 p-6 sm:p-10 bg-slate-950 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-6 sm:mb-8">
                      <h3 className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Activity Log</h3>
                      <button onClick={() => setSelectedStudentId(null)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-6 no-scrollbar">
                      {student.history.length > 0 ? (
                        (() => {
                          const groups: { date: string; totalPoints: number; records: PointRecord[] }[] = [];
                          student.history.forEach(record => {
                            const dateStr = safeFormat(record.date, "MMMM dd, yyyy");
                            const lastGroup = groups[groups.length - 1];
                            if (lastGroup && lastGroup.date === dateStr) {
                              lastGroup.records.push(record);
                              lastGroup.totalPoints += record.points;
                            } else {
                              groups.push({ date: dateStr, totalPoints: record.points, records: [record] });
                            }
                          });

                          return groups.map((group, gIndex) => (
                            <div key={group.date} className="space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="h-[1px] flex-1 bg-white/5" />
                                <div className="flex items-center gap-2">
                                  <span className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] whitespace-nowrap">
                                    {group.date}
                                  </span>
                                  <div className="w-1 h-1 rounded-full bg-royal-gold/30" />
                                  <span className="text-[8px] sm:text-[10px] font-black text-royal-gold uppercase tracking-[0.2em] whitespace-nowrap">
                                    {group.totalPoints} Points
                                  </span>
                                </div>
                                <div className="h-[1px] flex-1 bg-white/5" />
                              </div>
                              <div className="space-y-2 sm:space-y-3">
                                {group.records.map((record) => (
                                  <div key={record.id} className="flex items-center gap-2.5 sm:gap-4 p-3 sm:p-5 bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl group hover:bg-white/10 transition-all hover:translate-x-1">
                                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl royal-gradient-gold flex items-center justify-center text-black font-black flex-shrink-0 shadow-lg text-[10px] sm:text-base">
                                      +{record.points}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] sm:text-sm font-black text-white truncate uppercase tracking-tight group-hover:text-royal-gold transition-colors">{record.description}</p>
                                      <p className="text-[8px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5 sm:mt-1">Awarded at {safeFormat(record.createdAt, "hh:mm a")}</p>
                                    </div>
                                    {isAdmin && (
                                      <button 
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (confirm("Delete this point record?")) {
                                            await fetch(`/api/points/${record.id}`, { method: "DELETE" });
                                            fetchData();
                                          }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-red-400/60 hover:text-red-400 transition-all"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-700 space-y-6">
                          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/10">
                            <Star className="w-10 h-10 opacity-20" />
                          </div>
                          <p className="text-xs font-black uppercase tracking-[0.3em]">No royal points earned yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        )}
      </AnimatePresence>

      {/* Edit Student Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
              onClick={() => setEditingStudent(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-950 w-full max-w-md rounded-[3rem] p-10 shadow-3xl border border-white/10 overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 royal-gradient-gold opacity-10 blur-[80px] rounded-full" />
              <div className="flex items-center justify-between mb-10 relative z-10">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Edit Profile</h2>
                <button onClick={() => setEditingStudent(null)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
                  <X className="w-7 h-7" />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await fetch(`/api/students/${editingStudent.id}`, { method: "PUT", body: formData });
                setEditingStudent(null);
                fetchData();
              }} className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Royal Name</label>
                  <input 
                    name="name"
                    type="text" 
                    required
                    defaultValue={editingStudent.name}
                    className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black uppercase tracking-tight transition-all"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Update Portrait</label>
                  <div className="relative group">
                    <input 
                      name="photo"
                      type="file" 
                      accept="image/*"
                      className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-slate-500 font-black text-xs file:mr-6 file:py-2 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:royal-gradient-gold file:text-black hover:file:scale-105 transition-all"
                    />
                  </div>
                </div>
                <button className="w-full royal-gradient-gold text-black py-6 rounded-2xl font-black shadow-2xl shadow-royal-gold/20 hover:scale-[1.02] transition-all tracking-[0.2em] uppercase">
                  UPDATE ROYAL PROFILE
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Add Marks Modal */}
      <AnimatePresence>
        {showBulkAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-0 sm:px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" 
              onClick={() => setShowBulkAdd(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-slate-950 w-full h-full sm:h-[90vh] sm:max-w-4xl sm:rounded-[3rem] shadow-3xl overflow-hidden flex flex-col border-t sm:border border-white/10"
            >
              {/* Header */}
              <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between royal-gradient-gold text-black">
                <div className="flex items-center gap-4">
                  {bulkStep === "students" && (
                    <button 
                      onClick={() => setBulkStep("category")}
                      className="p-2 hover:bg-black/10 rounded-xl transition-all"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                  )}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tighter uppercase">
                      {bulkStep === "category" ? "Select Category" : `Marking: ${bulkCategory}`}
                    </h2>
                    <p className="text-black/60 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] mt-1">
                      {bulkStep === "category" ? "Choose what to award today" : "Tap photos to adjust marks"}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowBulkAdd(false)} className="text-black/60 hover:text-black transition-colors p-2 hover:bg-black/5 rounded-xl">
                  <X className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              </div>

              {/* Step 1: Category Selection */}
              {bulkStep === "category" && (
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 no-scrollbar">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
                    {dynamicCategories.map((cat) => {
                      const Icon = (categoryIcons as any)[cat] || MoreHorizontal;
                      return (
                        <motion.button
                          key={cat}
                          whileHover={{ scale: 1.05, y: -5 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            setBulkCategory(cat);
                            setBulkStep("students");
                            setBulkPoints({});
                          }}
                          className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-royal-gold/50 hover:bg-white/10 transition-all group aspect-square"
                        >
                          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-royal-gold/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-royal-gold" />
                          </div>
                          <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest text-center leading-tight">
                            {cat}
                          </span>
                        </motion.button>
                      );
                    })}
                    
                    {/* Add New Category Tile */}
                    <motion.button
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsAddingNewCategoryBulk(true)}
                      className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-[2rem] bg-white/5 border border-dashed border-white/20 hover:border-royal-gold/50 hover:bg-white/10 transition-all group aspect-square"
                    >
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                        <Plus className="w-6 h-6 sm:w-8 sm:h-8 text-slate-500" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-widest text-center">
                        New Category
                      </span>
                    </motion.button>
                  </div>

                  {/* New Category Input Overlay */}
                  <AnimatePresence>
                    {isAddingNewCategoryBulk && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="mt-8 p-6 bg-white/5 rounded-[2rem] border border-royal-gold/30"
                      >
                        <label className="text-[9px] font-black text-royal-gold uppercase tracking-[0.4em] mb-4 block">Enter Category Name</label>
                        <div className="flex gap-3">
                          <input 
                            type="text"
                            value={bulkCategory || ""}
                            onChange={(e) => setBulkCategory(e.target.value)}
                            placeholder="e.g. Science Quiz"
                            autoFocus
                            className="flex-1 px-6 py-4 bg-black/40 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none font-black text-white text-sm uppercase tracking-widest"
                          />
                          <button 
                            onClick={() => {
                              if (bulkCategory) {
                                const initialPoints: Record<string, string> = {};
                                data.students.forEach(s => {
                                  initialPoints[s.id] = "0";
                                });
                                setBulkPoints(initialPoints);
                                setBulkStep("students");
                              }
                              setIsAddingNewCategoryBulk(false);
                            }}
                            className="px-8 bg-royal-gold text-black rounded-2xl font-black text-xs uppercase tracking-widest"
                          >
                            NEXT
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Step 2: Member Selection Grid */}
              {bulkStep === "students" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Date Picker */}
                  <div className="px-6 py-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-royal-gold" />
                      <input 
                        type="date" 
                        value={bulkDate || ""}
                        onChange={(e) => setBulkDate(e.target.value)}
                        className="bg-transparent text-white font-black text-xs uppercase tracking-widest outline-none cursor-pointer"
                      />
                    </div>
                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {data.students.length} Members
                    </div>
                  </div>

                  {/* Photo Grid */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-8 no-scrollbar bg-black/20">
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-6">
                      {data.students.map((student) => {
                        const currentVal = parseFloat(bulkPoints[student.id] || "0");
                        const isActive = currentVal !== 0;
                        
                        return (
                          <motion.div
                            key={student.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={() => {
                              if (currentVal === 0) {
                                const defaultVal = (categoryDefaults as any)[bulkCategory] || 1;
                                setBulkPoints(prev => ({ ...prev, [student.id]: defaultVal.toString() }));
                              }
                            }}
                            className="relative group aspect-square cursor-pointer"
                          >
                            {/* Student Photo */}
                            <div className={cn(
                              "w-full h-full rounded-2xl sm:rounded-[2rem] overflow-hidden border-2 transition-all duration-500 shadow-xl",
                              isActive ? "border-royal-gold shadow-[0_0_30px_rgba(255,215,0,0.2)]" : "border-white/10"
                            )}>
                              {student.photo ? (
                                <img 
                                  src={student.photo} 
                                  alt={student.name} 
                                  className={cn(
                                    "w-full h-full object-cover transition-all duration-500",
                                    isActive ? "blur-sm scale-110" : ""
                                  )}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-700">
                                  <Users className="w-8 h-8" />
                                </div>
                              )}
                            </div>

                            {/* Marking Overlay */}
                            <div className={cn(
                              "absolute inset-0 flex flex-col items-center justify-center p-2 transition-all duration-500",
                              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}>
                              <div className="bg-black/60 backdrop-blur-md rounded-2xl p-2 sm:p-3 border border-white/20 flex flex-col items-center gap-2 shadow-2xl">
                                <span className="text-[8px] sm:text-[10px] font-black text-white/60 uppercase tracking-widest truncate max-w-[60px] sm:max-w-none">
                                  {student.name}
                                </span>
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <button 
                                    onClick={() => {
                                      const step = bulkCategory === "Homework" ? 10 : 1;
                                      const newVal = Math.max(0, currentVal - step);
                                      setBulkPoints(prev => ({ ...prev, [student.id]: newVal.toString() }));
                                    }}
                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                  >
                                    <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                  <span className="text-sm sm:text-xl font-black text-royal-gold font-mono min-w-[20px] text-center">
                                    {currentVal}
                                  </span>
                                  <button 
                                    onClick={() => {
                                      const step = bulkCategory === "Homework" ? 10 : 1;
                                      const newVal = currentVal + step;
                                      setBulkPoints(prev => ({ ...prev, [student.id]: newVal.toString() }));
                                    }}
                                    className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all"
                                  >
                                    <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 sm:p-8 bg-slate-950 border-t border-white/5 flex gap-4">
                    <button 
                      onClick={() => setBulkStep("category")}
                      className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs text-slate-400 uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      Change Category
                    </button>
                    <button 
                      onClick={async () => {
                        const payload = Object.entries(bulkPoints)
                          .filter(([_, points]) => points && parseFloat(points as string) !== 0)
                          .map(([studentId, points]) => ({
                            studentId,
                            points: parseFloat(points as string),
                            description: bulkCategory,
                            date: bulkDate
                          }));
                        
                        if (payload.length === 0) return;

                        await fetch("/api/points/bulk", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ points: payload })
                        });
                        
                        setShowBulkAdd(false);
                        setBulkStep("category");
                        setBulkPoints({});
                        setIsAddingNewCategoryBulk(false);
                        fetchData();
                      }}
                      className="flex-[2] royal-gradient-gold text-black py-4 rounded-2xl font-black shadow-2xl shadow-royal-gold/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 tracking-[0.2em] uppercase text-sm"
                    >
                      <Award className="w-5 h-5" />
                      SUBMIT MARKS
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
              onClick={() => setShowLogin(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-950 w-full max-w-md rounded-[3rem] p-12 shadow-3xl border border-white/10 overflow-hidden"
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 royal-gradient-purple opacity-20 blur-[80px] rounded-full" />
              <div className="flex items-center justify-between mb-10 relative z-10">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Royal Access</h2>
                <button onClick={() => setShowLogin(false)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
                  <X className="w-8 h-8" />
                </button>
              </div>
              <p className="text-slate-500 mb-10 font-black text-xs uppercase tracking-[0.3em] relative z-10">Enter the secret royal key to access admin chambers.</p>
              <form onSubmit={handleLogin} className="space-y-8 relative z-10">
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-royal-gold" />
                  <input 
                    type="password" 
                    placeholder="SECRET ROYAL KEY" 
                    value={adminPassword || ""}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    autoFocus
                    className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black tracking-[0.4em] uppercase placeholder:tracking-widest placeholder:text-slate-800"
                  />
                </div>
                <button className="w-full royal-gradient-gold text-black py-6 rounded-2xl font-black shadow-2xl shadow-royal-gold/20 hover:scale-[1.02] transition-all tracking-[0.3em] uppercase">
                  UNLOCK CHAMBERS
                </button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-950 px-2 text-slate-500 font-black tracking-widest leading-none">OR ADMIN LOGIN</span>
                  </div>
                </div>
                <button 
                  type="button"
                  disabled={isSigningIn}
                  onClick={handleGoogleLogin}
                  className="w-full bg-white text-black py-6 rounded-2xl font-black shadow-2xl hover:scale-[1.02] transition-all tracking-[0.3em] uppercase flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                  ) : (
                    <Globe className="w-6 h-6" />
                  )}
                  {isSigningIn ? "SIGNING IN..." : "SIGN IN WITH GOOGLE"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Student Modal */}
      <AnimatePresence>
        {showAddStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
              onClick={() => setShowAddStudent(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-950 w-full max-w-md rounded-[3rem] p-12 shadow-3xl border border-white/10 overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 royal-gradient-emerald opacity-10 blur-[80px] rounded-full" />
              <div className="flex items-center justify-between mb-10 relative z-10">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Enroll Student</h2>
                <button onClick={() => setShowAddStudent(false)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
                  <X className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await fetch("/api/students", { method: "POST", body: formData });
                setShowAddStudent(false);
                fetchData();
              }} className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Royal Full Name</label>
                  <input 
                    name="name"
                    type="text" 
                    required
                    placeholder="e.g. Stephen Ludia" 
                    className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black uppercase tracking-tight placeholder:text-slate-800"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Royal Portrait</label>
                  <input 
                    name="photo"
                    type="file" 
                    accept="image/*"
                    className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-slate-500 font-black text-xs file:mr-6 file:py-2 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:royal-gradient-gold file:text-black hover:file:scale-105 transition-all"
                  />
                </div>
                <button className="w-full royal-gradient-gold text-black py-6 rounded-2xl font-black shadow-2xl shadow-royal-gold/20 hover:scale-[1.02] transition-all tracking-[0.2em] uppercase">
                  ENROLL IN ACADEMY
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Points Modal */}
      <AnimatePresence>
        {showAddPoints && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
              onClick={() => setShowAddPoints(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-950 w-full max-w-md rounded-[3rem] p-12 shadow-3xl border border-white/10 overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 royal-gradient-gold opacity-10 blur-[80px] rounded-full" />
              <div className="flex items-center justify-between mb-10 relative z-10">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Bestow Marks</h2>
                <button onClick={() => setShowAddPoints(null)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
                  <X className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const payload = {
                  studentId: showAddPoints,
                  points: parseFloat((formData.get("points") || "0") as string),
                  description: isAddingNewCategorySingle ? singleCategory : (formData.get("description") as string),
                  date: formData.get("date") as string
                };
                await fetch("/api/points", { 
                  method: "POST", 
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload) 
                });
                setShowAddPoints(null);
                setIsAddingNewCategorySingle(false);
                setSingleCategory("");
                fetchData();
              }} className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Points Amount</label>
                  <input 
                    name="points"
                    type="number" 
                    step="any"
                    required
                    placeholder="e.g. 50" 
                    className="w-full px-8 py-6 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black text-4xl text-center placeholder:text-slate-800"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Category</label>
                  <div className="space-y-3">
                    {!isAddingNewCategorySingle ? (
                      <select 
                        name="description"
                        required
                        onChange={(e) => {
                          if (e.target.value === "ADD_NEW") {
                            setIsAddingNewCategorySingle(true);
                          }
                        }}
                        className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black uppercase tracking-widest cursor-pointer appearance-none"
                      >
                        <option value="" disabled selected className="bg-slate-900">Select Category</option>
                        {dynamicCategories.map(cat => (
                          <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                        ))}
                        <option value="ADD_NEW" className="bg-slate-900 text-royal-gold font-bold">+ Add New Category...</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={singleCategory || ""}
                          onChange={(e) => setSingleCategory(e.target.value)}
                          placeholder="Enter new category"
                          required
                          autoFocus
                          className="flex-1 px-8 py-5 bg-white/5 border border-royal-gold/50 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none font-black text-white uppercase tracking-widest"
                        />
                        <button 
                          type="button"
                          onClick={() => setIsAddingNewCategorySingle(false)}
                          className="px-4 bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Date</label>
                  <input 
                    name="date"
                    type="date" 
                    defaultValue={format(new Date(), "yyyy-MM-dd")}
                    className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black uppercase tracking-widest cursor-pointer"
                  />
                </div>
                <button className="w-full royal-gradient-gold text-black py-6 rounded-2xl font-black shadow-2xl shadow-royal-gold/20 hover:scale-[1.02] transition-all tracking-[0.2em] uppercase">
                  AWARD ROYAL POINTS
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Group Modal */}
      <AnimatePresence>
        {editingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
              onClick={() => setEditingGroup(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-950 w-full max-w-2xl rounded-[3rem] p-6 sm:p-12 shadow-3xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 royal-gradient-gold opacity-10 blur-[80px] rounded-full" />
              
              <div className="flex items-center justify-between mb-8 relative z-10 shrink-0">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase">Configure Team</h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Group Management</p>
                </div>
                <button onClick={() => setEditingGroup(null)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="space-y-8 relative z-10 overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Team Name</label>
                      <input 
                        type="text" 
                        value={editingGroup.name || ""}
                        onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                        placeholder="Enter team name..." 
                        className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black tracking-tight placeholder:text-slate-800"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Team Key (Numeric)</label>
                      <input 
                        type="text" 
                        pattern="[0-9]*"
                        value={editingGroup.key || ""}
                        onChange={(e) => setEditingGroup({ ...editingGroup, key: e.target.value.replace(/\D/g, '') })}
                        placeholder="e.g. 1234" 
                        className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black tracking-tight placeholder:text-slate-800"
                      />
                    </div>
                  </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Select Students</label>
                    <span className="text-[10px] font-black text-royal-gold uppercase tracking-widest">
                      {editingGroup.studentIds.length} Selected
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.students.map(student => {
                      const isSelected = editingGroup.studentIds.includes(student.id);
                      const isInOtherGroup = tenderGroups.some(g => g.id !== editingGroup.id && g.studentIds.includes(student.id));
                      
                      return (
                        <button
                          key={student.id}
                          disabled={isInOtherGroup}
                          onClick={() => {
                            const newIds = isSelected 
                              ? editingGroup.studentIds.filter(id => id !== student.id)
                              : [...editingGroup.studentIds, student.id];
                            setEditingGroup({ ...editingGroup, studentIds: newIds });
                          }}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left",
                            isSelected 
                              ? "bg-royal-gold/10 border-royal-gold/50 text-white" 
                              : isInOtherGroup
                                ? "bg-white/5 border-white/5 opacity-30 cursor-not-allowed"
                                : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20"
                          )}
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-900 overflow-hidden shrink-0">
                            {student.photo ? (
                              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-700">
                                <Users className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-xs uppercase truncate">{student.name}</p>
                            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                              {isInOtherGroup ? 'Already in a team' : isSelected ? 'Selected' : 'Available'}
                            </p>
                          </div>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-royal-gold shadow-[0_0_10px_rgba(255,215,0,0.5)]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-4 border-t border-white/5 relative z-10 shrink-0">
                <button 
                  onClick={async () => {
                    await setDoc(doc(db, "tender_groups", editingGroup.id), {
                      ...editingGroup,
                      updatedAt: serverTimestamp()
                    });
                    setEditingGroup(null);
                  }}
                  className="w-full royal-gradient-gold text-black py-6 rounded-2xl font-black shadow-2xl shadow-royal-gold/20 hover:scale-[1.02] transition-all tracking-[0.2em] uppercase"
                >
                  Save Team Configuration
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Gallery Modal */}


      <AnimatePresence>
        {showAddGallery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
              onClick={() => setShowAddGallery(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-950 w-full max-w-md rounded-[3rem] p-12 shadow-3xl border border-white/10 overflow-hidden"
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 royal-gradient-gold opacity-10 blur-[80px] rounded-full" />
              <div className="flex items-center justify-between mb-10 relative z-10">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Add to Gallery</h2>
                <button onClick={() => setShowAddGallery(false)} className="text-slate-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-xl">
                  <X className="w-8 h-8" />
                </button>
              </div>
              <form onSubmit={handleAddGallery} className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Image URL</label>
                  <input 
                    type="url" 
                    required
                    placeholder="https://example.com/image.jpg" 
                    value={newGalleryUrl || ""}
                    onChange={(e) => setNewGalleryUrl(e.target.value)}
                    className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black tracking-tight placeholder:text-slate-800"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Caption (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Annual Sports Day 2024" 
                    value={newGalleryCaption || ""}
                    onChange={(e) => setNewGalleryCaption(e.target.value)}
                    className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black uppercase tracking-tight placeholder:text-slate-800"
                  />
                </div>
                <button className="w-full royal-gradient-gold text-black py-6 rounded-2xl font-black shadow-2xl shadow-royal-gold/20 hover:scale-[1.02] transition-all tracking-[0.2em] uppercase">
                  PUBLISH TO GALLERY
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
