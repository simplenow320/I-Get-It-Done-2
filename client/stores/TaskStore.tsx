import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

export type Lane = "now" | "soon" | "later" | "park";

export interface Task {
  id: string;
  title: string;
  notes?: string;
  lane: Lane;
  createdAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  assignedTo?: string;
}

export interface LaneTimings {
  now: "same_day" | "24_hours";
  soon: "2_3_days" | "end_of_week" | "custom";
  later: "1_week" | "2_weeks" | "custom";
  park: "monthly" | "quarterly" | "manual";
}

export interface UserSettings {
  mode: "solo" | "team";
  laneTimings: LaneTimings;
  onboardingComplete: boolean;
}

interface TaskStoreContext {
  tasks: Task[];
  settings: UserSettings;
  addTask: (title: string, lane: Lane, notes?: string) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newLane: Lane) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  getTasksByLane: (lane: Lane) => Task[];
  getCompletedTasks: () => Task[];
  completeOnboarding: () => void;
}

const defaultSettings: UserSettings = {
  mode: "solo",
  laneTimings: {
    now: "same_day",
    soon: "2_3_days",
    later: "1_week",
    park: "monthly",
  },
  onboardingComplete: false,
};

const TaskStoreContext = createContext<TaskStoreContext | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const calculateDueDate = useCallback((lane: Lane): Date => {
    const now = new Date();
    switch (lane) {
      case "now":
        return new Date(now.setHours(23, 59, 59, 999));
      case "soon":
        const soonDays = settings.laneTimings.soon === "2_3_days" ? 3 : 7;
        return new Date(now.getTime() + soonDays * 24 * 60 * 60 * 1000);
      case "later":
        const laterDays = settings.laneTimings.later === "1_week" ? 7 : 14;
        return new Date(now.getTime() + laterDays * 24 * 60 * 60 * 1000);
      case "park":
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
  }, [settings.laneTimings]);

  const addTask = useCallback((title: string, lane: Lane, notes?: string) => {
    const newTask: Task = {
      id: generateId(),
      title,
      notes,
      lane,
      createdAt: new Date(),
      dueDate: calculateDueDate(lane),
    };
    setTasks((prev) => [newTask, ...prev]);
  }, [calculateDueDate]);

  const completeTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completedAt: new Date() } : task
      )
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const moveTask = useCallback((id: string, newLane: Lane) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, lane: newLane, dueDate: calculateDueDate(newLane) }
          : task
      )
    );
  }, [calculateDueDate]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  }, []);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const getTasksByLane = useCallback(
    (lane: Lane) => tasks.filter((task) => task.lane === lane && !task.completedAt),
    [tasks]
  );

  const getCompletedTasks = useCallback(
    () => tasks.filter((task) => task.completedAt),
    [tasks]
  );

  const completeOnboarding = useCallback(() => {
    setSettings((prev) => ({ ...prev, onboardingComplete: true }));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTasks((prev) =>
        prev.map((task) => {
          if (task.completedAt || !task.dueDate) return task;
          const dueTime = new Date(task.dueDate).getTime();
          if (now.getTime() >= dueTime) {
            if (task.lane === "later") {
              return { ...task, lane: "soon" as Lane, dueDate: calculateDueDate("soon") };
            } else if (task.lane === "soon") {
              return { ...task, lane: "now" as Lane, dueDate: calculateDueDate("now") };
            }
          }
          return task;
        })
      );
    }, 60000);
    return () => clearInterval(interval);
  }, [calculateDueDate]);

  return (
    <TaskStoreContext.Provider
      value={{
        tasks,
        settings,
        addTask,
        completeTask,
        deleteTask,
        moveTask,
        updateTask,
        updateSettings,
        getTasksByLane,
        getCompletedTasks,
        completeOnboarding,
      }}
    >
      {children}
    </TaskStoreContext.Provider>
  );
}

export function useTaskStore() {
  const context = useContext(TaskStoreContext);
  if (!context) {
    throw new Error("useTaskStore must be used within a TaskStoreProvider");
  }
  return context;
}
