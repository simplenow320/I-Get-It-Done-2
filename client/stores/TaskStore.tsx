import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Lane = "now" | "soon" | "later" | "park";
export type ReminderType = "soft" | "strong" | "persistent" | "none";
export type DelegationStatus = "assigned" | "in_progress" | "waiting" | "needs_review" | "done";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface DelegationNote {
  id: string;
  type: "update" | "blocked" | "question" | "completed" | "custom";
  text: string;
  createdAt: Date;
  author: "owner" | "delegate";
}

export interface Contact {
  id: string;
  name: string;
  role?: string;
  color: string;
  createdAt: Date;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  lane: Lane;
  createdAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  assignedTo?: string;
  subtasks: Subtask[];
  reminderType: ReminderType;
  focusTimeMinutes: number;
  isOverdue: boolean;
  delegationStatus?: DelegationStatus;
  delegationNotes?: DelegationNote[];
  delegatedAt?: Date;
  lastDelegationUpdate?: Date;
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

export interface UnsortedTask {
  id: string;
  title: string;
}

const CONTACT_COLORS = [
  "#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#007AFF", 
  "#AF52DE", "#FF2D55", "#5856D6", "#00C7BE", "#FF6B60",
];

interface TaskStoreContext {
  tasks: Task[];
  unsortedTasks: UnsortedTask[];
  contacts: Contact[];
  settings: UserSettings;
  addTask: (title: string, lane: Lane, notes?: string) => void;
  addUnsortedTask: (title: string) => void;
  addMultipleUnsortedTasks: (titles: string[]) => void;
  sortUnsortedTask: (id: string, lane: Lane) => void;
  removeUnsortedTask: (id: string) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newLane: Lane) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  updateSettings: (updates: Partial<UserSettings>) => void;
  getTasksByLane: (lane: Lane) => Task[];
  getCompletedTasks: () => Task[];
  completeOnboarding: () => void;
  addSubtask: (taskId: string, title: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  getTaskProgress: (taskId: string) => number;
  addFocusTime: (taskId: string, minutes: number) => void;
  addContact: (name: string, role?: string) => Contact;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  getContactById: (id: string) => Contact | undefined;
  delegateTask: (taskId: string, contactId: string) => void;
  undelegateTask: (taskId: string) => void;
  updateDelegationStatus: (taskId: string, status: DelegationStatus) => void;
  addDelegationNote: (taskId: string, type: DelegationNote["type"], text: string) => void;
  getDelegatedTasks: () => Task[];
  getDelegatedTasksByContact: (contactId: string) => Task[];
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

const STORAGE_KEY = "@task_store";

const TaskStoreContext = createContext<TaskStoreContext | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unsortedTasks, setUnsortedTasks] = useState<UnsortedTask[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveState();
    }
  }, [tasks, unsortedTasks, contacts, settings, isLoaded]);

  const parseDate = (value: unknown): Date => {
    if (value instanceof Date) return value;
    if (typeof value === "string") return new Date(value);
    return new Date();
  };

  const parseDateOptional = (value: unknown): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === "string") return new Date(value);
    return undefined;
  };

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.tasks) setTasks(parsed.tasks.map((t: Record<string, unknown>) => ({
          ...t,
          createdAt: parseDate(t.createdAt),
          dueDate: parseDateOptional(t.dueDate),
          completedAt: parseDateOptional(t.completedAt),
          delegatedAt: parseDateOptional(t.delegatedAt),
          lastDelegationUpdate: parseDateOptional(t.lastDelegationUpdate),
          delegationNotes: Array.isArray(t.delegationNotes) ? t.delegationNotes.map((n: Record<string, unknown>) => ({
            ...n,
            createdAt: parseDate(n.createdAt),
          })) : undefined,
        })));
        if (parsed.unsortedTasks) setUnsortedTasks(parsed.unsortedTasks);
        if (parsed.contacts) setContacts(parsed.contacts.map((c: Record<string, unknown>) => ({
          ...c,
          createdAt: parseDate(c.createdAt),
        })));
        if (parsed.settings) setSettings({ ...defaultSettings, ...parsed.settings });
      }
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load task store:", error);
      setIsLoaded(true);
    }
  };

  const serializeDate = (date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    return date instanceof Date ? date.toISOString() : String(date);
  };

  const saveState = async () => {
    try {
      const serializedTasks = tasks.map(task => ({
        ...task,
        createdAt: serializeDate(task.createdAt),
        dueDate: serializeDate(task.dueDate),
        completedAt: serializeDate(task.completedAt),
        delegatedAt: serializeDate(task.delegatedAt),
        lastDelegationUpdate: serializeDate(task.lastDelegationUpdate),
        delegationNotes: task.delegationNotes?.map(note => ({
          ...note,
          createdAt: serializeDate(note.createdAt),
        })),
      }));
      
      const serializedContacts = contacts.map(contact => ({
        ...contact,
        createdAt: serializeDate(contact.createdAt),
      }));

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        tasks: serializedTasks,
        unsortedTasks,
        contacts: serializedContacts,
        settings,
      }));
    } catch (error) {
      console.error("Failed to save task store:", error);
    }
  };

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
      subtasks: [],
      reminderType: "soft",
      focusTimeMinutes: 0,
      isOverdue: false,
    };
    setTasks((prev) => [newTask, ...prev]);
  }, [calculateDueDate]);

  const addUnsortedTask = useCallback((title: string) => {
    const newTask: UnsortedTask = {
      id: generateId(),
      title: title.trim(),
    };
    if (newTask.title) {
      setUnsortedTasks((prev) => [...prev, newTask]);
    }
  }, []);

  const addMultipleUnsortedTasks = useCallback((titles: string[]) => {
    const newTasks = titles
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((title) => ({
        id: generateId(),
        title,
      }));
    setUnsortedTasks((prev) => [...prev, ...newTasks]);
  }, []);

  const sortUnsortedTask = useCallback((id: string, lane: Lane) => {
    const unsorted = unsortedTasks.find((t) => t.id === id);
    if (unsorted) {
      const newTask: Task = {
        id: generateId(),
        title: unsorted.title,
        lane,
        createdAt: new Date(),
        dueDate: calculateDueDate(lane),
        subtasks: [],
        reminderType: "soft",
        focusTimeMinutes: 0,
        isOverdue: false,
      };
      setTasks((prev) => [newTask, ...prev]);
      setUnsortedTasks((prev) => prev.filter((t) => t.id !== id));
    }
  }, [unsortedTasks, calculateDueDate]);

  const removeUnsortedTask = useCallback((id: string) => {
    setUnsortedTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

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
          ? { ...task, lane: newLane, dueDate: calculateDueDate(newLane), isOverdue: false }
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

  const addSubtask = useCallback((taskId: string, title: string) => {
    if (!title.trim()) return;
    const newSubtask: Subtask = {
      id: generateId(),
      title: title.trim(),
      completed: false,
    };
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, subtasks: [...task.subtasks, newSubtask] }
          : task
      )
    );
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((st) =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
              ),
            }
          : task
      )
    );
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, subtasks: task.subtasks.filter((st) => st.id !== subtaskId) }
          : task
      )
    );
  }, []);

  const getTaskProgress = useCallback((taskId: string): number => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.subtasks.length === 0) return 0;
    const completed = task.subtasks.filter((st) => st.completed).length;
    return Math.round((completed / task.subtasks.length) * 100);
  }, [tasks]);

  const addFocusTime = useCallback((taskId: string, minutes: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, focusTimeMinutes: task.focusTimeMinutes + minutes }
          : task
      )
    );
  }, []);

  const addContact = useCallback((name: string, role?: string): Contact => {
    const newContact: Contact = {
      id: generateId(),
      name: name.trim(),
      role: role?.trim(),
      color: CONTACT_COLORS[contacts.length % CONTACT_COLORS.length],
      createdAt: new Date(),
    };
    setContacts((prev) => [...prev, newContact]);
    return newContact;
  }, [contacts.length]);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setContacts((prev) =>
      prev.map((contact) => (contact.id === id ? { ...contact, ...updates } : contact))
    );
  }, []);

  const deleteContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
    setTasks((prev) =>
      prev.map((task) =>
        task.assignedTo === id
          ? { ...task, assignedTo: undefined, delegationStatus: undefined, delegatedAt: undefined }
          : task
      )
    );
  }, []);

  const getContactById = useCallback((id: string): Contact | undefined => {
    return contacts.find((c) => c.id === id);
  }, [contacts]);

  const delegateTask = useCallback((taskId: string, contactId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              assignedTo: contactId,
              delegationStatus: "assigned",
              delegatedAt: new Date(),
              lastDelegationUpdate: new Date(),
              delegationNotes: [],
            }
          : task
      )
    );
  }, []);

  const undelegateTask = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              assignedTo: undefined,
              delegationStatus: undefined,
              delegatedAt: undefined,
              lastDelegationUpdate: undefined,
              delegationNotes: undefined,
            }
          : task
      )
    );
  }, []);

  const updateDelegationStatus = useCallback((taskId: string, status: DelegationStatus) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, delegationStatus: status, lastDelegationUpdate: new Date() }
          : task
      )
    );
  }, []);

  const addDelegationNote = useCallback((taskId: string, type: DelegationNote["type"], text: string) => {
    const newNote: DelegationNote = {
      id: generateId(),
      type,
      text: text.trim(),
      createdAt: new Date(),
      author: "owner",
    };
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              delegationNotes: [...(task.delegationNotes || []), newNote],
              lastDelegationUpdate: new Date(),
            }
          : task
      )
    );
  }, []);

  const getDelegatedTasks = useCallback((): Task[] => {
    return tasks.filter((task) => task.assignedTo && !task.completedAt);
  }, [tasks]);

  const getDelegatedTasksByContact = useCallback((contactId: string): Task[] => {
    return tasks.filter((task) => task.assignedTo === contactId && !task.completedAt);
  }, [tasks]);

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
            } else if (task.lane === "now") {
              return { ...task, isOverdue: true };
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
        unsortedTasks,
        contacts,
        settings,
        addTask,
        addUnsortedTask,
        addMultipleUnsortedTasks,
        sortUnsortedTask,
        removeUnsortedTask,
        completeTask,
        deleteTask,
        moveTask,
        updateTask,
        updateSettings,
        getTasksByLane,
        getCompletedTasks,
        completeOnboarding,
        addSubtask,
        toggleSubtask,
        deleteSubtask,
        getTaskProgress,
        addFocusTime,
        addContact,
        updateContact,
        deleteContact,
        getContactById,
        delegateTask,
        undelegateTask,
        updateDelegationStatus,
        addDelegationNote,
        getDelegatedTasks,
        getDelegatedTasksByContact,
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
