/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
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
  Zap
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

interface AppData {
  students: Student[];
  points: PointRecord[];
}

export default function App() {
  const [data, setData] = useState<AppData>({ students: [], points: [] });
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<"total" | "daily" | "admin" | "analytics">("total");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddPoints, setShowAddPoints] = useState<string | null>(null); // studentId
  const [loading, setLoading] = useState(true);

  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkCategory, setBulkCategory] = useState("Math Quiz");
  const [bulkDate, setBulkDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [bulkPoints, setBulkPoints] = useState<Record<string, string>>({});
  const [dailyViewDate, setDailyViewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [weeklyViewDate, setWeeklyViewDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddingNewCategoryBulk, setIsAddingNewCategoryBulk] = useState(false);
  const [isAddingNewCategorySingle, setIsAddingNewCategorySingle] = useState(false);
  const [singleCategory, setSingleCategory] = useState("");

  // Categories logic
  const dynamicCategories = useMemo(() => {
    const categories = new Set(["Math Quiz", "GK Challenge", "Handwriting", "On Time", "Behaviour", "Game", "Attendance", "Other"]);
    data.points.forEach(p => {
      if (p.description) categories.add(p.description);
    });
    return Array.from(categories).sort();
  }, [data.points]);

  // Fetch data
  const fetchData = async () => {
    try {
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
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Admin Login
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

  // Calculations
  const allTimeStats = useMemo(() => {
    return data.students.map(student => {
      const points = data.points.filter(p => p.studentId === student.id);
      const totalPoints = points.reduce((sum, p) => sum + p.points, 0);

      return {
        ...student,
        totalPoints,
        history: points.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [data]);

  const weeklyLeaderboard = useMemo(() => {
    const targetDate = parseISO(weeklyViewDate);
    const start = startOfWeek(targetDate, { weekStartsOn: 1 });
    const end = endOfWeek(targetDate, { weekStartsOn: 1 });

    return data.students.map(student => {
      const points = data.points
        .filter(p => {
          const pDate = parseISO(p.date);
          return p.studentId === student.id && isWithinInterval(pDate, { start, end });
        })
        .reduce((sum, p) => sum + p.points, 0);

      const allPoints = data.points.filter(p => p.studentId === student.id);

      return {
        ...student,
        totalPoints: points, // Points for this week
        allTimePoints: allPoints.reduce((sum, p) => sum + p.points, 0),
        history: allPoints.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      };
    }).filter(s => s.totalPoints > 0).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [data, weeklyViewDate]);

  const dailyLeaderboard = useMemo(() => {
    const targetDate = parseISO(dailyViewDate);
    return data.students.map(student => {
      const points = data.points
        .filter(p => p.studentId === student.id && isSameDay(parseISO(p.date), targetDate))
        .reduce((sum, p) => sum + p.points, 0);
      return { ...student, totalPoints: points }; // Reuse totalPoints key for consistent UI
    }).filter(s => s.totalPoints > 0).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [data, dailyViewDate]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center space-y-8">
        <motion.div
          animate={{
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-[3rem] shadow-[0_0_50px_rgba(79,70,229,0.3)]"
        >
          <Trophy className="w-20 h-20 text-white" />
        </motion.div>
        <div className="text-center">
          <h1 className="text-2xl font-black text-white tracking-[0.3em] uppercase mb-2">Loading Stats</h1>
          <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mx-auto">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="w-full h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans pb-20 selection:bg-royal-gold selection:text-black overflow-x-hidden">
      <div className="noise-overlay" />

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
                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-royal-gold animate-pulse" />
                <p className="text-[8px] sm:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] truncate">Tuition Excellence</p>
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
        {/* Navigation Tabs */}
        <div className="flex bg-white/5 backdrop-blur-xl p-1 sm:p-2 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 mb-6 sm:mb-12 no-scrollbar shadow-3xl">
          {[
            { id: "total", label: "HALL OF FAME", icon: Award },
            { id: "daily", label: "DAILY STARS", icon: Sparkles },
            { id: "analytics", label: "INSIGHTS", icon: BarChart3 },
            ...(isAdmin ? [{ id: "admin", label: "ROSTER", icon: Users }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1 sm:gap-3 px-1.5 sm:px-10 py-2.5 sm:py-5 rounded-[1.2rem] sm:rounded-[2rem] text-[8px] sm:text-xs font-black transition-all whitespace-nowrap flex-1 justify-center tracking-tight sm:tracking-[0.2em] relative group",
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
                <div className="flex flex-col items-center sm:items-start">
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 uppercase whitespace-nowrap">Weekly Hall of Fame</h2>
                  <p className="text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-[0.3em] mt-1">
                    {format(startOfWeek(parseISO(weeklyViewDate), { weekStartsOn: 1 }), "MMM dd")} - {format(endOfWeek(parseISO(weeklyViewDate), { weekStartsOn: 1 }), "MMM dd, yyyy")}
                  </p>
                </div>
                <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden self-center sm:self-auto">
                  <button
                    onClick={() => setWeeklyViewDate(format(subWeeks(parseISO(weeklyViewDate), 1), "yyyy-MM-dd"))}
                    className="p-3 sm:p-4 hover:bg-white/10 text-slate-400 hover:text-white transition-all border-r border-white/5"
                  >
                    <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 rotate-90" />
                  </button>
                  <div className="px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 relative">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-royal-gold" />
                    <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">Select Week</span>
                    <input
                      type="date"
                      value={weeklyViewDate}
                      onChange={(e) => setWeeklyViewDate(e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() => setWeeklyViewDate(format(addWeeks(parseISO(weeklyViewDate), 1), "yyyy-MM-dd"))}
                    className="p-3 sm:p-4 hover:bg-white/10 text-slate-400 hover:text-white transition-all border-l border-white/5"
                  >
                    <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 -rotate-90" />
                  </button>
                </div>
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
                <div className="flex flex-col items-center sm:items-start">
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-500 uppercase whitespace-nowrap">DAILY STARS</h2>
                  <p className="text-slate-500 text-[10px] sm:text-sm font-bold uppercase tracking-[0.3em] mt-1">Royal Performers for {format(parseISO(dailyViewDate), "MMMM dd")}</p>
                </div>
                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl border border-white/10 p-3 rounded-2xl sm:rounded-3xl shadow-2xl group self-center sm:self-auto">
                  <Calendar className="w-5 h-5 text-royal-gold ml-3 group-hover:scale-110 transition-transform" />
                  <input
                    type="date"
                    value={dailyViewDate}
                    onChange={(e) => setDailyViewDate(e.target.value)}
                    className="bg-transparent text-white font-black text-sm outline-none pr-6 py-2 uppercase tracking-widest cursor-pointer"
                  />
                </div>
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
                        .filter(p => isSameDay(parseISO(p.date), date))
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
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mb-8">Member since {format(parseISO(student.createdAt), "MMM yyyy")}</p>

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

                    <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-2 sm:space-y-4 no-scrollbar">
                      {student.history.length > 0 ? (
                        student.history.map((record) => (
                          <div key={record.id} className="flex items-center gap-2.5 sm:gap-4 p-3 sm:p-5 bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl group hover:bg-white/10 transition-all hover:translate-x-1">
                            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl royal-gradient-gold flex items-center justify-center text-black font-black flex-shrink-0 shadow-lg text-[10px] sm:text-base">
                              +{record.points}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] sm:text-sm font-black text-white truncate uppercase tracking-tight group-hover:text-royal-gold transition-colors">{record.description}</p>
                              <p className="text-[8px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5 sm:mt-1">{format(parseISO(record.date), "MMMM dd, yyyy")}</p>
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
                        ))
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
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              onClick={() => setShowBulkAdd(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-950 w-full max-w-2xl rounded-[3rem] shadow-3xl overflow-hidden flex flex-col h-[85vh] border border-white/10"
            >
              <div className="p-5 sm:p-8 border-b border-white/5 flex items-center justify-between royal-gradient-gold text-black">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tighter uppercase">Add Royal Marks</h2>
                  <p className="text-black/60 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] mt-1">Distribute points to the academy</p>
                </div>
                <button onClick={() => setShowBulkAdd(false)} className="text-black/60 hover:text-black transition-colors p-2 hover:bg-black/5 rounded-xl">
                  <X className="w-6 h-6 sm:w-7 sm:h-7" />
                </button>
              </div>

              <div className="p-5 sm:p-8 bg-white/5 border-b border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Category</label>
                  <div className="space-y-2 sm:space-y-3">
                    {!isAddingNewCategoryBulk ? (
                      <select
                        value={bulkCategory}
                        onChange={(e) => {
                          if (e.target.value === "ADD_NEW") {
                            setIsAddingNewCategoryBulk(true);
                            setBulkCategory("");
                          } else {
                            setBulkCategory(e.target.value);
                          }
                        }}
                        className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none font-black text-white text-sm sm:text-base uppercase tracking-widest cursor-pointer appearance-none"
                      >
                        {dynamicCategories.map(cat => (
                          <option key={cat} value={cat} className="bg-slate-900 text-white">{cat}</option>
                        ))}
                        <option value="ADD_NEW" className="bg-slate-900 text-royal-gold font-bold">+ Add New Category...</option>
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={bulkCategory}
                          onChange={(e) => setBulkCategory(e.target.value)}
                          placeholder="Enter new category"
                          autoFocus
                          className="flex-1 px-4 py-3 sm:px-6 sm:py-4 bg-white/5 border border-royal-gold/50 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none font-black text-white text-sm sm:text-base uppercase tracking-widest"
                        />
                        <button
                          onClick={() => {
                            setIsAddingNewCategoryBulk(false);
                            if (!bulkCategory) setBulkCategory(dynamicCategories[0]);
                          }}
                          className="px-3 bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Date</label>
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none font-black text-white text-sm sm:text-base uppercase tracking-widest cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2 sm:space-y-3 no-scrollbar bg-black/20">
                {data.students.map((student) => (
                  <div key={student.id} className="flex items-center gap-4 p-3 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/10 transition-all">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex-shrink-0">
                      {student.photo ? (
                        <img src={student.photo} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700">
                          <Users className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-sm text-white truncate uppercase tracking-tight group-hover:text-royal-gold transition-colors">{student.name}</h4>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        placeholder="0"
                        value={bulkPoints[student.id] || ""}
                        onChange={(e) => setBulkPoints(prev => ({ ...prev, [student.id]: e.target.value }))}
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-royal-gold outline-none text-center font-black text-royal-gold placeholder:text-slate-800 text-lg"
                      />
                    </div>
                  </div>
                ))}
                {data.students.length === 0 && (
                  <div className="text-center py-20 text-slate-700 font-black uppercase tracking-[0.4em]">No royal students found</div>
                )}
              </div>

              <div className="p-5 sm:p-8 bg-slate-950 border-t border-white/5">
                <button
                  onClick={async () => {
                    const payload = Object.entries(bulkPoints)
                      .filter(([_, points]) => points && parseInt(points as string) !== 0)
                      .map(([studentId, points]) => ({
                        studentId,
                        points: parseInt(points as string),
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
                    setBulkPoints({});
                    setIsAddingNewCategoryBulk(false);
                    fetchData();
                  }}
                  className="w-full royal-gradient-gold text-black py-4 sm:py-5 rounded-2xl font-black shadow-2xl shadow-royal-gold/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3 sm:gap-4 tracking-[0.2em] uppercase text-sm sm:text-base"
                >
                  <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                  BESTOW ROYAL MARKS
                </button>
              </div>
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
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    autoFocus
                    className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-royal-gold outline-none text-white font-black tracking-[0.4em] uppercase placeholder:tracking-widest placeholder:text-slate-800"
                  />
                </div>
                <button className="w-full royal-gradient-gold text-black py-6 rounded-2xl font-black shadow-2xl shadow-royal-gold/20 hover:scale-[1.02] transition-all tracking-[0.3em] uppercase">
                  UNLOCK CHAMBERS
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
                  points: parseInt((formData.get("points") || "0") as string),
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
                          value={singleCategory}
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

    </div>
  );
}
