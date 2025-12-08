import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Level = "starter" | "focused" | "productive" | "unstoppable" | "legendary";

export interface DailyStats {
  date: string;
  tasksCompleted: number;
  subtasksCompleted: number;
  focusMinutes: number;
  nowCleared: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

export interface GamificationState {
  currentStreak: number;
  longestStreak: number;
  totalTasksCompleted: number;
  totalSubtasksCompleted: number;
  totalFocusMinutes: number;
  points: number;
  level: Level;
  lastActiveDate: string | null;
  dailyStats: DailyStats[];
  achievements: Achievement[];
  streakProtectionUsed: boolean;
}

interface GamificationContextType extends GamificationState {
  recordTaskComplete: (hasSubtasks: boolean, subtaskCount: number) => void;
  recordSubtaskComplete: () => void;
  recordFocusSession: (minutes: number) => void;
  recordNowCleared: () => void;
  getLevel: () => Level;
  getLevelProgress: () => number;
  getPointsToNextLevel: () => number;
  getTodayStats: () => DailyStats | null;
  getWeeklyStats: () => { tasksCompleted: number; focusMinutes: number; daysActive: number };
  useStreakProtection: () => boolean;
  pendingUnlock: Achievement | null;
  dismissUnlock: () => void;
}

const LEVEL_THRESHOLDS: Record<Level, number> = {
  starter: 0,
  focused: 100,
  productive: 500,
  unstoppable: 1500,
  legendary: 5000,
};

const LEVEL_ORDER: Level[] = ["starter", "focused", "productive", "unstoppable", "legendary"];

const POINTS = {
  taskComplete: 10,
  taskWithSubtasksComplete: 25,
  subtaskComplete: 5,
  focusSessionComplete: 15,
  nowCleared: 50,
  streakDay: 20,
};

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_task", title: "First Step", description: "Complete your first task", icon: "award" },
  { id: "streak_3", title: "On a Roll", description: "Maintain a 3-day streak", icon: "zap" },
  { id: "streak_7", title: "Week Warrior", description: "Maintain a 7-day streak", icon: "star" },
  { id: "streak_30", title: "Month Master", description: "Maintain a 30-day streak", icon: "award" },
  { id: "focus_60", title: "Deep Work", description: "Accumulate 60 focus minutes", icon: "target" },
  { id: "focus_300", title: "Flow State", description: "Accumulate 300 focus minutes", icon: "sun" },
  { id: "tasks_10", title: "Getting Things Done", description: "Complete 10 tasks", icon: "check-circle" },
  { id: "tasks_50", title: "Productivity Pro", description: "Complete 50 tasks", icon: "trending-up" },
  { id: "tasks_100", title: "Century Club", description: "Complete 100 tasks", icon: "gift" },
  { id: "level_focused", title: "Focused Achiever", description: "Reach Focused level", icon: "eye" },
  { id: "level_productive", title: "Productivity Master", description: "Reach Productive level", icon: "bar-chart-2" },
  { id: "level_unstoppable", title: "Unstoppable Force", description: "Reach Unstoppable level", icon: "shield" },
];

const STORAGE_KEY = "@gamification_state";

const defaultState: GamificationState = {
  currentStreak: 0,
  longestStreak: 0,
  totalTasksCompleted: 0,
  totalSubtasksCompleted: 0,
  totalFocusMinutes: 0,
  points: 0,
  level: "starter",
  lastActiveDate: null,
  dailyStats: [],
  achievements: INITIAL_ACHIEVEMENTS,
  streakProtectionUsed: false,
};

const GamificationContext = createContext<GamificationContextType | null>(null);

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getDaysDiff(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GamificationState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingUnlock, setPendingUnlock] = useState<Achievement | null>(null);
  const [unlockQueue, setUnlockQueue] = useState<Achievement[]>([]);

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveState();
    }
  }, [state, isLoaded]);

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setState({ ...defaultState, ...parsed });
      }
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load gamification state:", error);
      setIsLoaded(true);
    }
  };

  const saveState = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Failed to save gamification state:", error);
    }
  };

  const updateStreak = useCallback(() => {
    const today = getTodayString();
    
    setState((prev) => {
      if (prev.lastActiveDate === today) {
        return prev;
      }

      let newStreak = prev.currentStreak;
      let streakProtectionUsed = prev.streakProtectionUsed;

      if (prev.lastActiveDate) {
        const daysDiff = getDaysDiff(prev.lastActiveDate, today);
        if (daysDiff === 1) {
          newStreak = prev.currentStreak + 1;
          streakProtectionUsed = false;
        } else if (daysDiff === 2 && !prev.streakProtectionUsed) {
          newStreak = prev.currentStreak + 1;
          streakProtectionUsed = true;
        } else if (daysDiff > 2 || (daysDiff === 2 && prev.streakProtectionUsed)) {
          newStreak = 1;
          streakProtectionUsed = false;
        }
      } else {
        newStreak = 1;
      }

      const longestStreak = Math.max(prev.longestStreak, newStreak);
      const streakPoints = newStreak > prev.currentStreak ? POINTS.streakDay : 0;

      return {
        ...prev,
        currentStreak: newStreak,
        longestStreak,
        lastActiveDate: today,
        streakProtectionUsed,
        points: prev.points + streakPoints,
      };
    });
  }, []);

  const getOrCreateTodayStats = useCallback((): DailyStats => {
    const today = getTodayString();
    const existing = state.dailyStats.find((s) => s.date === today);
    if (existing) return existing;
    return {
      date: today,
      tasksCompleted: 0,
      subtasksCompleted: 0,
      focusMinutes: 0,
      nowCleared: false,
    };
  }, [state.dailyStats]);

  const updateDailyStats = useCallback((updater: (stats: DailyStats) => DailyStats) => {
    const today = getTodayString();
    setState((prev) => {
      const existingIndex = prev.dailyStats.findIndex((s) => s.date === today);
      const currentStats = existingIndex >= 0 
        ? prev.dailyStats[existingIndex] 
        : { date: today, tasksCompleted: 0, subtasksCompleted: 0, focusMinutes: 0, nowCleared: false };
      
      const updatedStats = updater(currentStats);
      
      const newDailyStats = existingIndex >= 0
        ? prev.dailyStats.map((s, i) => (i === existingIndex ? updatedStats : s))
        : [...prev.dailyStats.slice(-29), updatedStats];

      return { ...prev, dailyStats: newDailyStats };
    });
  }, []);

  const checkAndUnlockAchievements = useCallback((newState: GamificationState) => {
    const unlocks: string[] = [];
    const now = new Date();

    if (newState.totalTasksCompleted >= 1) unlocks.push("first_task");
    if (newState.totalTasksCompleted >= 10) unlocks.push("tasks_10");
    if (newState.totalTasksCompleted >= 50) unlocks.push("tasks_50");
    if (newState.totalTasksCompleted >= 100) unlocks.push("tasks_100");
    if (newState.currentStreak >= 3) unlocks.push("streak_3");
    if (newState.currentStreak >= 7) unlocks.push("streak_7");
    if (newState.currentStreak >= 30) unlocks.push("streak_30");
    if (newState.totalFocusMinutes >= 60) unlocks.push("focus_60");
    if (newState.totalFocusMinutes >= 300) unlocks.push("focus_300");
    if (newState.level === "focused" || LEVEL_ORDER.indexOf(newState.level) > LEVEL_ORDER.indexOf("focused")) {
      unlocks.push("level_focused");
    }
    if (newState.level === "productive" || LEVEL_ORDER.indexOf(newState.level) > LEVEL_ORDER.indexOf("productive")) {
      unlocks.push("level_productive");
    }
    if (newState.level === "unstoppable" || LEVEL_ORDER.indexOf(newState.level) > LEVEL_ORDER.indexOf("unstoppable")) {
      unlocks.push("level_unstoppable");
    }

    setState((prev) => {
      const newlyUnlocked: Achievement[] = [];
      const updatedAchievements = prev.achievements.map((a) => {
        if (unlocks.includes(a.id) && !a.unlockedAt) {
          const updated = { ...a, unlockedAt: now };
          newlyUnlocked.push(updated);
          return updated;
        }
        return a;
      });

      if (newlyUnlocked.length > 0) {
        setUnlockQueue((q) => [...q, ...newlyUnlocked]);
      }

      return { ...prev, achievements: updatedAchievements };
    });
  }, []);

  useEffect(() => {
    if (!pendingUnlock && unlockQueue.length > 0) {
      const [next, ...rest] = unlockQueue;
      setPendingUnlock(next);
      setUnlockQueue(rest);
    }
  }, [pendingUnlock, unlockQueue]);

  const dismissUnlock = useCallback(() => {
    setPendingUnlock(null);
  }, []);

  const calculateLevel = useCallback((points: number): Level => {
    let currentLevel: Level = "starter";
    for (const level of LEVEL_ORDER) {
      if (points >= LEVEL_THRESHOLDS[level]) {
        currentLevel = level;
      }
    }
    return currentLevel;
  }, []);

  const recordTaskComplete = useCallback((hasSubtasks: boolean, subtaskCount: number) => {
    updateStreak();
    
    setState((prev) => {
      const pointsEarned = hasSubtasks ? POINTS.taskWithSubtasksComplete : POINTS.taskComplete;
      const newPoints = prev.points + pointsEarned;
      const newLevel = calculateLevel(newPoints);
      const newTotalTasks = prev.totalTasksCompleted + 1;

      const newState = {
        ...prev,
        totalTasksCompleted: newTotalTasks,
        points: newPoints,
        level: newLevel,
      };

      checkAndUnlockAchievements(newState);
      return newState;
    });

    updateDailyStats((stats) => ({
      ...stats,
      tasksCompleted: stats.tasksCompleted + 1,
    }));
  }, [updateStreak, updateDailyStats, calculateLevel, checkAndUnlockAchievements]);

  const recordSubtaskComplete = useCallback(() => {
    updateStreak();
    
    setState((prev) => {
      const newPoints = prev.points + POINTS.subtaskComplete;
      const newLevel = calculateLevel(newPoints);

      return {
        ...prev,
        totalSubtasksCompleted: prev.totalSubtasksCompleted + 1,
        points: newPoints,
        level: newLevel,
      };
    });

    updateDailyStats((stats) => ({
      ...stats,
      subtasksCompleted: stats.subtasksCompleted + 1,
    }));
  }, [updateStreak, updateDailyStats, calculateLevel]);

  const recordFocusSession = useCallback((minutes: number) => {
    updateStreak();

    setState((prev) => {
      const newPoints = prev.points + POINTS.focusSessionComplete;
      const newLevel = calculateLevel(newPoints);
      const newFocusMinutes = prev.totalFocusMinutes + minutes;

      const newState = {
        ...prev,
        totalFocusMinutes: newFocusMinutes,
        points: newPoints,
        level: newLevel,
      };

      setTimeout(() => checkAndUnlockAchievements(newState), 0);
      return newState;
    });

    updateDailyStats((stats) => ({
      ...stats,
      focusMinutes: stats.focusMinutes + minutes,
    }));
  }, [updateStreak, updateDailyStats, calculateLevel, checkAndUnlockAchievements]);

  const recordNowCleared = useCallback(() => {
    const today = getTodayString();
    const alreadyCleared = state.dailyStats.find((s) => s.date === today)?.nowCleared;

    if (!alreadyCleared) {
      setState((prev) => {
        const newPoints = prev.points + POINTS.nowCleared;
        return { ...prev, points: newPoints, level: calculateLevel(newPoints) };
      });

      updateDailyStats((stats) => ({ ...stats, nowCleared: true }));
    }
  }, [state.dailyStats, updateDailyStats, calculateLevel]);

  const getLevel = useCallback((): Level => {
    return state.level;
  }, [state.level]);

  const getLevelProgress = useCallback((): number => {
    const currentLevelIndex = LEVEL_ORDER.indexOf(state.level);
    if (currentLevelIndex === LEVEL_ORDER.length - 1) return 100;

    const currentThreshold = LEVEL_THRESHOLDS[state.level];
    const nextThreshold = LEVEL_THRESHOLDS[LEVEL_ORDER[currentLevelIndex + 1]];
    const progress = ((state.points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }, [state.points, state.level]);

  const getPointsToNextLevel = useCallback((): number => {
    const currentLevelIndex = LEVEL_ORDER.indexOf(state.level);
    if (currentLevelIndex === LEVEL_ORDER.length - 1) return 0;

    const nextThreshold = LEVEL_THRESHOLDS[LEVEL_ORDER[currentLevelIndex + 1]];
    return Math.max(nextThreshold - state.points, 0);
  }, [state.points, state.level]);

  const getTodayStats = useCallback((): DailyStats | null => {
    const today = getTodayString();
    return state.dailyStats.find((s) => s.date === today) || null;
  }, [state.dailyStats]);

  const getWeeklyStats = useCallback(() => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoString = weekAgo.toISOString().split("T")[0];

    const weekStats = state.dailyStats.filter((s) => s.date >= weekAgoString);
    
    return {
      tasksCompleted: weekStats.reduce((sum, s) => sum + s.tasksCompleted, 0),
      focusMinutes: weekStats.reduce((sum, s) => sum + s.focusMinutes, 0),
      daysActive: weekStats.length,
    };
  }, [state.dailyStats]);

  const useStreakProtection = useCallback((): boolean => {
    if (state.streakProtectionUsed) return false;
    setState((prev) => ({ ...prev, streakProtectionUsed: true }));
    return true;
  }, [state.streakProtectionUsed]);

  return (
    <GamificationContext.Provider
      value={{
        ...state,
        recordTaskComplete,
        recordSubtaskComplete,
        recordFocusSession,
        recordNowCleared,
        getLevel,
        getLevelProgress,
        getPointsToNextLevel,
        getTodayStats,
        getWeeklyStats,
        useStreakProtection,
        pendingUnlock,
        dismissUnlock,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamification must be used within a GamificationProvider");
  }
  return context;
}
