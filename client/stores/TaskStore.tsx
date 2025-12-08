import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

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
const SETTINGS_STORAGE_KEY = "@user_settings";

const TaskStoreContext = createContext<TaskStoreContext | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unsortedTasks, setUnsortedTasks] = useState<UnsortedTask[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const generateId = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    const randomPart2 = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomPart}-${randomPart2}`;
  };

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
      const storedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }

      const storedUnsorted = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedUnsorted) {
        const parsed = JSON.parse(storedUnsorted);
        if (parsed.unsortedTasks) setUnsortedTasks(parsed.unsortedTasks);
      }

      await loadFromSupabase();
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load task store:", error);
      setIsLoaded(true);
    }
  };

  const loadFromSupabase = async () => {
    try {
      const { data: users } = await supabase.from("users").select("*").limit(1);
      let currentUserId = users && users.length > 0 ? users[0].id : null;
      
      if (!currentUserId) {
        const { data: newUser, error: userError } = await supabase
          .from("users")
          .insert({ email: "local@device.app" })
          .select()
          .single();
        if (newUser) currentUserId = newUser.id;
      }
      
      if (currentUserId) {
        setUserId(currentUserId);

        const { data: dbTasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", currentUserId)
          .order("created_at", { ascending: false });

        if (dbTasks && dbTasks.length > 0) {
          const taskIds = dbTasks.map(t => t.id);
          const { data: dbSubtasks } = await supabase
            .from("subtasks")
            .select("*")
            .in("task_id", taskIds);

          const subtaskMap = new Map<string, Subtask[]>();
          if (dbSubtasks) {
            dbSubtasks.forEach(st => {
              const existing = subtaskMap.get(st.task_id) || [];
              existing.push({
                id: st.id,
                title: st.title,
                completed: st.completed,
              });
              subtaskMap.set(st.task_id, existing);
            });
          }

          const loadedTasks: Task[] = dbTasks.map(t => ({
            id: t.id,
            title: t.title,
            notes: t.notes || undefined,
            lane: t.lane as Lane,
            createdAt: new Date(t.created_at),
            dueDate: t.due_date ? new Date(t.due_date) : undefined,
            completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
            subtasks: subtaskMap.get(t.id) || [],
            reminderType: (t.reminder_type || "soft") as ReminderType,
            focusTimeMinutes: 0,
            isOverdue: t.is_overdue || false,
          }));

          setTasks(loadedTasks);
        }

        const { data: dbContacts } = await supabase
          .from("contacts")
          .select("*")
          .eq("user_id", currentUserId);

        if (dbContacts && dbContacts.length > 0) {
          const loadedContacts: Contact[] = dbContacts.map(c => ({
            id: c.id,
            name: c.name,
            role: c.role || undefined,
            color: c.color,
            createdAt: new Date(),
          }));
          setContacts(loadedContacts);
        }
      }
    } catch (error) {
      console.error("Failed to load from Supabase:", error);
    }
  };

  const serializeDate = (date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    return date instanceof Date ? date.toISOString() : String(date);
  };

  const saveState = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ unsortedTasks }));
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save local state:", error);
    }
  };

  const saveTaskToSupabase = async (task: Task) => {
    if (!userId) return;
    try {
      await supabase.from("tasks").upsert({
        id: task.id,
        user_id: userId,
        title: task.title,
        notes: task.notes || null,
        lane: task.lane,
        reminder_type: task.reminderType,
        is_overdue: task.isOverdue,
        created_at: task.createdAt.toISOString(),
        completed_at: task.completedAt ? task.completedAt.toISOString() : null,
        due_date: task.dueDate ? task.dueDate.toISOString() : null,
      });
    } catch (error) {
      console.error("Failed to save task to Supabase:", error);
    }
  };

  const deleteTaskFromSupabase = async (taskId: string) => {
    try {
      await supabase.from("tasks").delete().eq("id", taskId);
    } catch (error) {
      console.error("Failed to delete task from Supabase:", error);
    }
  };

  const saveSubtaskToSupabase = async (taskId: string, subtask: Subtask) => {
    try {
      await supabase.from("subtasks").upsert({
        id: subtask.id,
        task_id: taskId,
        title: subtask.title,
        completed: subtask.completed,
      });
    } catch (error) {
      console.error("Failed to save subtask to Supabase:", error);
    }
  };

  const deleteSubtaskFromSupabase = async (subtaskId: string) => {
    try {
      await supabase.from("subtasks").delete().eq("id", subtaskId);
    } catch (error) {
      console.error("Failed to delete subtask from Supabase:", error);
    }
  };

  const saveContactToSupabase = async (contact: Contact) => {
    if (!userId) return;
    try {
      await supabase.from("contacts").upsert({
        id: contact.id,
        user_id: userId,
        name: contact.name,
        role: contact.role || null,
        color: contact.color,
      });
    } catch (error) {
      console.error("Failed to save contact to Supabase:", error);
    }
  };

  const deleteContactFromSupabase = async (contactId: string) => {
    try {
      await supabase.from("contacts").delete().eq("id", contactId);
    } catch (error) {
      console.error("Failed to delete contact from Supabase:", error);
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
    saveTaskToSupabase(newTask);
  }, [calculateDueDate, userId]);

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
      saveTaskToSupabase(newTask);
    }
  }, [unsortedTasks, calculateDueDate, userId]);

  const removeUnsortedTask = useCallback((id: string) => {
    setUnsortedTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks((prev) => {
      const updated = prev.map((task) =>
        task.id === id ? { ...task, completedAt: new Date() } : task
      );
      const task = updated.find(t => t.id === id);
      if (task) saveTaskToSupabase(task);
      return updated;
    });
  }, [userId]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    deleteTaskFromSupabase(id);
  }, []);

  const moveTask = useCallback((id: string, newLane: Lane) => {
    setTasks((prev) => {
      const updated = prev.map((task) =>
        task.id === id
          ? { ...task, lane: newLane, dueDate: calculateDueDate(newLane), isOverdue: false }
          : task
      );
      const task = updated.find(t => t.id === id);
      if (task) saveTaskToSupabase(task);
      return updated;
    });
  }, [calculateDueDate, userId]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks((prev) => {
      const updated = prev.map((task) => (task.id === id ? { ...task, ...updates } : task));
      const task = updated.find(t => t.id === id);
      if (task) saveTaskToSupabase(task);
      return updated;
    });
  }, [userId]);

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
    saveSubtaskToSupabase(taskId, newSubtask);
  }, []);

  const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) => {
      const updated = prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((st) =>
                st.id === subtaskId ? { ...st, completed: !st.completed } : st
              ),
            }
          : task
      );
      const task = updated.find(t => t.id === taskId);
      const subtask = task?.subtasks.find(st => st.id === subtaskId);
      if (subtask) saveSubtaskToSupabase(taskId, subtask);
      return updated;
    });
  }, []);

  const deleteSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, subtasks: task.subtasks.filter((st) => st.id !== subtaskId) }
          : task
      )
    );
    deleteSubtaskFromSupabase(subtaskId);
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
    saveContactToSupabase(newContact);
    return newContact;
  }, [contacts.length, userId]);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setContacts((prev) => {
      const updated = prev.map((contact) => (contact.id === id ? { ...contact, ...updates } : contact));
      const contact = updated.find(c => c.id === id);
      if (contact) saveContactToSupabase(contact);
      return updated;
    });
  }, [userId]);

  const deleteContact = useCallback((id: string) => {
    setContacts((prev) => prev.filter((contact) => contact.id !== id));
    setTasks((prev) =>
      prev.map((task) =>
        task.assignedTo === id
          ? { ...task, assignedTo: undefined, delegationStatus: undefined, delegatedAt: undefined }
          : task
      )
    );
    deleteContactFromSupabase(id);
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
