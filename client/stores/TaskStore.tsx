import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "@/lib/query-client";
import { scheduleOverdueNotification } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";

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

export interface TeamMember {
  id: string;
  teammateId: string;
  nickname: string;
  role?: string;
  color: string;
  teammateName?: string;
  teammateEmail?: string;
}

export interface TeamInvite {
  id: string;
  inviteCode: string;
  inviterId?: string;
  inviteeEmail?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  expiresAt?: Date;
  inviterName?: string;
  inviterEmail?: string;
}

export interface DelegatedToMeTask {
  id: string;
  title: string;
  notes?: string;
  lane: Lane;
  createdAt: Date;
  dueDate?: Date;
  subtasks: Subtask[];
  delegationStatus?: DelegationStatus;
  delegationNotes?: DelegationNote[];
  delegatedAt?: Date;
  ownerName: string;
  ownerEmail?: string;
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
  delegatedToUserId?: string;
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
  teamCode: string;
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
  teamMembers: TeamMember[];
  teamInvites: { sent: TeamInvite[]; received: TeamInvite[] };
  delegatedToMeTasks: DelegatedToMeTask[];
  settings: UserSettings;
  userId: string | null;
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
  delegateTaskToUser: (taskId: string, teammateId: string) => void;
  undelegateTask: (taskId: string) => void;
  updateDelegationStatus: (taskId: string, status: DelegationStatus) => void;
  addDelegationNote: (taskId: string, type: DelegationNote["type"], text: string) => void;
  getDelegatedTasks: () => Task[];
  getDelegatedTasksByContact: (contactId: string) => Task[];
  checkOverdueTasks: () => { movedCount: number; tasks: Task[] };
  createTeamInvite: (inviteeEmail?: string) => Promise<TeamInvite | null>;
  acceptTeamInvite: (inviteCode: string) => Promise<boolean>;
  declineTeamInvite: (inviteId: string) => Promise<boolean>;
  removeTeamMember: (teamMemberId: string) => Promise<boolean>;
  refreshTeamData: () => Promise<void>;
  refreshDelegatedToMe: () => Promise<void>;
  updateDelegatedTaskStatus: (taskId: string, status: DelegationStatus, note?: string) => Promise<boolean>;
  getTeamMemberById: (id: string) => TeamMember | undefined;
}

const defaultSettings: UserSettings = {
  mode: "solo",
  teamCode: "",
  laneTimings: {
    now: "same_day",
    soon: "2_3_days",
    later: "1_week",
    park: "monthly",
  },
  onboardingComplete: false,
};

const STORAGE_KEY_PREFIX = "@task_store_";
const SETTINGS_STORAGE_KEY_PREFIX = "@user_settings_";

const TaskStoreContext = createContext<TaskStoreContext | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unsortedTasks, setUnsortedTasks] = useState<UnsortedTask[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamInvites, setTeamInvites] = useState<{ sent: TeamInvite[]; received: TeamInvite[] }>({ sent: [], received: [] });
  const [delegatedToMeTasks, setDelegatedToMeTasks] = useState<DelegatedToMeTask[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const userId = user?.id || null;

  const generateId = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    const randomPart2 = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomPart}-${randomPart2}`;
  };

  const getStorageKey = () => `${STORAGE_KEY_PREFIX}${userId}`;
  const getSettingsStorageKey = () => `${SETTINGS_STORAGE_KEY_PREFIX}${userId}`;

  useEffect(() => {
    if (isAuthenticated && userId) {
      loadState();
    }
  }, [isAuthenticated, userId]);

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
      const settingsKey = getSettingsStorageKey();
      const storageKey = getStorageKey();
      
      const storedSettings = await AsyncStorage.getItem(settingsKey);
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsedSettings });
      } else {
        setSettings(defaultSettings);
      }

      const storedUnsorted = await AsyncStorage.getItem(storageKey);
      if (storedUnsorted) {
        const parsed = JSON.parse(storedUnsorted);
        if (parsed.unsortedTasks) setUnsortedTasks(parsed.unsortedTasks);
      }

      await loadFromDatabase();
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load task store:", error);
      setIsLoaded(true);
    }
  };

  const loadFromDatabase = async () => {
    try {
      if (!userId) return;

      const tasksResponse = await apiRequest("GET", `/api/tasks/${userId}`);
      const tasksData = await tasksResponse.json();

      if (tasksData.tasks && tasksData.tasks.length > 0) {
        const loadedTasks: Task[] = tasksData.tasks.map((t: any) => ({
          id: t.id,
          title: t.title,
          notes: t.notes || undefined,
          lane: t.lane as Lane,
          createdAt: parseDate(t.createdAt),
          dueDate: parseDateOptional(t.dueDate),
          completedAt: parseDateOptional(t.completedAt),
          subtasks: (t.subtasks || []).map((st: any) => ({
            id: st.id,
            title: st.title,
            completed: st.completed,
          })),
          reminderType: (t.reminderType || "soft") as ReminderType,
          focusTimeMinutes: t.focusTimeMinutes || 0,
          isOverdue: t.isOverdue || false,
          assignedTo: t.assignedTo || undefined,
          delegationStatus: t.delegationStatus || undefined,
          delegatedAt: parseDateOptional(t.delegatedAt),
          lastDelegationUpdate: parseDateOptional(t.lastDelegationUpdate),
          delegationNotes: (t.delegationNotes || []).map((n: any) => ({
            id: n.id,
            type: n.type,
            text: n.text,
            createdAt: parseDate(n.createdAt),
            author: "owner" as const,
          })),
        }));

        setTasks(loadedTasks);
      }

      const contactsResponse = await apiRequest("GET", `/api/contacts/${userId}`);
      const contactsData = await contactsResponse.json();

      if (contactsData.contacts && contactsData.contacts.length > 0) {
        const loadedContacts: Contact[] = contactsData.contacts.map((c: any) => ({
          id: c.id,
          name: c.name,
          role: c.role || undefined,
          color: c.color,
          createdAt: parseDate(c.createdAt),
        }));
        setContacts(loadedContacts);
      }
    } catch (error) {
      console.error("Failed to load from database:", error);
    }
  };

  const serializeDate = (date: Date | undefined): string | undefined => {
    if (!date) return undefined;
    return date instanceof Date ? date.toISOString() : String(date);
  };

  const saveState = async () => {
    try {
      const storageKey = getStorageKey();
      const settingsKey = getSettingsStorageKey();
      
      await AsyncStorage.setItem(storageKey, JSON.stringify({ unsortedTasks }));
      await AsyncStorage.setItem(settingsKey, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save local state:", error);
    }
  };

  const saveTaskToApi = async (task: Task, isNew: boolean = false) => {
    if (!userId) return;
    try {
      if (isNew) {
        await apiRequest("POST", "/api/tasks", {
          id: task.id,
          userId,
          title: task.title,
          notes: task.notes,
          lane: task.lane,
          reminderType: task.reminderType,
          dueDate: task.dueDate?.toISOString(),
          assignedTo: task.assignedTo,
        });
      } else {
        await apiRequest("PUT", `/api/tasks/${task.id}`, {
          title: task.title,
          notes: task.notes,
          lane: task.lane,
          reminderType: task.reminderType,
          isOverdue: task.isOverdue,
          completedAt: task.completedAt?.toISOString(),
          dueDate: task.dueDate?.toISOString(),
          focusTimeMinutes: task.focusTimeMinutes,
          assignedTo: task.assignedTo,
          delegationStatus: task.delegationStatus,
          delegatedAt: task.delegatedAt?.toISOString(),
          lastDelegationUpdate: task.lastDelegationUpdate?.toISOString(),
        });
      }
    } catch (error) {
      console.error("Failed to save task:", error);
    }
  };

  const deleteTaskFromApi = async (taskId: string) => {
    try {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    } catch (error) {
      console.error("Failed to delete task:", error);
    }
  };

  const saveSubtaskToApi = async (taskId: string, subtask: Subtask, isNew: boolean = false) => {
    try {
      if (isNew) {
        await apiRequest("POST", "/api/subtasks", {
          id: subtask.id,
          taskId,
          title: subtask.title,
        });
      } else {
        await apiRequest("PUT", `/api/subtasks/${subtask.id}`, {
          completed: subtask.completed,
          title: subtask.title,
        });
      }
    } catch (error) {
      console.error("Failed to save subtask:", error);
    }
  };

  const deleteSubtaskFromApi = async (subtaskId: string) => {
    try {
      await apiRequest("DELETE", `/api/subtasks/${subtaskId}`);
    } catch (error) {
      console.error("Failed to delete subtask:", error);
    }
  };

  const saveContactToApi = async (contact: Contact) => {
    if (!userId) return;
    try {
      await apiRequest("POST", "/api/contacts", {
        id: contact.id,
        userId,
        name: contact.name,
        role: contact.role,
        color: contact.color,
      });
    } catch (error) {
      console.error("Failed to save contact:", error);
    }
  };

  const deleteContactFromApi = async (contactId: string) => {
    try {
      await apiRequest("DELETE", `/api/contacts/${contactId}`);
    } catch (error) {
      console.error("Failed to delete contact:", error);
    }
  };

  const saveDelegationNoteToApi = async (taskId: string, note: DelegationNote) => {
    try {
      await apiRequest("POST", "/api/delegation-notes", {
        taskId,
        type: note.type,
        text: note.text,
      });
    } catch (error) {
      console.error("Failed to save delegation note:", error);
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
    saveTaskToApi(newTask, true);
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
      saveTaskToApi(newTask, true);
    }
  }, [unsortedTasks, calculateDueDate, userId]);

  const removeUnsortedTask = useCallback((id: string) => {
    setUnsortedTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const completeTask = useCallback((id: string) => {
    const completedTask = tasks.find(t => t.id === id);
    if (!completedTask) return;
    
    const updated = { ...completedTask, completedAt: new Date() };
    setTasks((prev) => prev.map((task) =>
      task.id === id ? updated : task
    ));
    
    saveTaskToApi(updated).catch(err => {
      console.error("Failed to complete task:", err);
    });
  }, [tasks, userId]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    deleteTaskFromApi(id);
  }, []);

  const moveTask = useCallback((id: string, newLane: Lane) => {
    const taskToMove = tasks.find(t => t.id === id);
    if (!taskToMove) return;
    
    const updated = { ...taskToMove, lane: newLane, dueDate: calculateDueDate(newLane), isOverdue: false };
    setTasks((prev) => prev.map((task) =>
      task.id === id ? updated : task
    ));
    
    saveTaskToApi(updated).catch(err => {
      console.error("Failed to move task:", err);
    });
  }, [tasks, calculateDueDate, userId]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const taskToUpdate = tasks.find(t => t.id === id);
    if (!taskToUpdate) return;
    
    const updated = { ...taskToUpdate, ...updates };
    setTasks((prev) => prev.map((task) =>
      task.id === id ? updated : task
    ));
    
    saveTaskToApi(updated).catch(err => {
      console.error("Failed to update task:", err);
    });
  }, [tasks, userId]);

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
    saveSubtaskToApi(taskId, newSubtask, true);
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
      if (subtask) saveSubtaskToApi(taskId, subtask);
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
    deleteSubtaskFromApi(subtaskId);
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
    saveContactToApi(newContact);
    return newContact;
  }, [contacts.length, userId]);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setContacts((prev) => {
      const updated = prev.map((contact) => (contact.id === id ? { ...contact, ...updates } : contact));
      const contact = updated.find(c => c.id === id);
      if (contact) saveContactToApi(contact);
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
    deleteContactFromApi(id);
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

  const checkOverdueTasks = useCallback((): { movedCount: number; tasks: Task[] } => {
    const now = new Date();
    const movedTasks: Task[] = [];
    const newlyOverdueTasks: Task[] = [];
    
    setTasks((prev) =>
      prev.map((task) => {
        if (task.completedAt || !task.dueDate) return task;
        const dueTime = new Date(task.dueDate).getTime();
        if (now.getTime() >= dueTime) {
          if (task.lane === "later") {
            const updated = { ...task, lane: "soon" as Lane, dueDate: calculateDueDate("soon") };
            movedTasks.push(updated);
            return updated;
          } else if (task.lane === "soon") {
            const updated = { ...task, lane: "now" as Lane, dueDate: calculateDueDate("now") };
            movedTasks.push(updated);
            return updated;
          } else if (task.lane === "now" && !task.isOverdue) {
            const updated = { ...task, isOverdue: true };
            movedTasks.push(updated);
            newlyOverdueTasks.push(updated);
            return updated;
          }
        }
        return task;
      })
    );
    
    movedTasks.forEach((task) => saveTaskToApi(task));
    newlyOverdueTasks.forEach((task) => {
      scheduleOverdueNotification(task.title, task.id);
    });
    
    return { movedCount: movedTasks.length, tasks: movedTasks };
  }, [calculateDueDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkOverdueTasks();
    }, 60000);
    return () => clearInterval(interval);
  }, [checkOverdueTasks]);

  const refreshTeamData = useCallback(async (): Promise<void> => {
    if (!userId) return;
    try {
      const [membersRes, invitesRes] = await Promise.all([
        apiRequest("GET", `/api/team/members/${userId}`),
        apiRequest("GET", `/api/team/invites/${userId}`),
      ]);
      const membersData = await membersRes.json();
      const invitesData = await invitesRes.json();
      
      setTeamMembers(membersData.members || []);
      setTeamInvites({
        sent: invitesData.sentInvites || [],
        received: invitesData.receivedInvites || [],
      });
    } catch (error) {
      console.error("Failed to refresh team data:", error);
    }
  }, [userId]);

  const refreshDelegatedToMe = useCallback(async (): Promise<void> => {
    if (!userId) return;
    try {
      const response = await apiRequest("GET", `/api/delegated-to-me/${userId}`);
      const data = await response.json();
      setDelegatedToMeTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to refresh delegated tasks:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (isAuthenticated && userId && settings.mode === "team") {
      refreshTeamData();
      refreshDelegatedToMe();
    }
  }, [isAuthenticated, userId, settings.mode, refreshTeamData, refreshDelegatedToMe]);

  const createTeamInvite = useCallback(async (inviteeEmail?: string): Promise<TeamInvite | null> => {
    if (!userId) return null;
    try {
      const response = await apiRequest("POST", "/api/team/invite", { inviterId: userId, inviteeEmail });
      const data = await response.json();
      if (data.invite) {
        setTeamInvites((prev) => ({
          ...prev,
          sent: [...prev.sent, data.invite],
        }));
        return data.invite;
      }
      return null;
    } catch (error) {
      console.error("Failed to create invite:", error);
      return null;
    }
  }, [userId]);

  const acceptTeamInvite = useCallback(async (inviteCode: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const response = await apiRequest("POST", "/api/team/invite/accept", { inviteCode, userId });
      if (response.ok) {
        await refreshTeamData();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to accept invite:", error);
      return false;
    }
  }, [userId, refreshTeamData]);

  const declineTeamInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try {
      const response = await apiRequest("POST", "/api/team/invite/decline", { inviteId });
      if (response.ok) {
        setTeamInvites((prev) => ({
          ...prev,
          received: prev.received.filter((inv) => inv.id !== inviteId),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to decline invite:", error);
      return false;
    }
  }, []);

  const removeTeamMember = useCallback(async (teamMemberId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const response = await apiRequest("DELETE", `/api/team/members/${teamMemberId}`, { userId });
      if (response.ok) {
        setTeamMembers((prev) => prev.filter((m) => m.id !== teamMemberId));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to remove team member:", error);
      return false;
    }
  }, [userId]);

  const delegateTaskToUser = useCallback((taskId: string, teammateId: string) => {
    const teammate = teamMembers.find((m) => m.teammateId === teammateId);
    if (!teammate) return;
    
    const now = new Date();
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              assignedTo: teammate.nickname,
              delegatedToUserId: teammateId,
              delegationStatus: "assigned" as DelegationStatus,
              delegatedAt: now,
              lastDelegationUpdate: now,
            }
          : task
      )
    );
    
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      saveTaskToApi({
        ...task,
        assignedTo: teammate.nickname,
        delegatedToUserId: teammateId,
        delegationStatus: "assigned",
        delegatedAt: now,
        lastDelegationUpdate: now,
      }).catch(console.error);
    }
  }, [teamMembers, tasks, saveTaskToApi]);

  const updateDelegatedTaskStatus = useCallback(async (
    taskId: string, 
    status: DelegationStatus, 
    note?: string
  ): Promise<boolean> => {
    if (!userId) return false;
    try {
      const response = await apiRequest("PUT", `/api/delegation-status/${taskId}`, { userId, status, note });
      if (response.ok) {
        setDelegatedToMeTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? { ...task, delegationStatus: status }
              : task
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update delegation status:", error);
      return false;
    }
  }, [userId]);

  const getTeamMemberById = useCallback((id: string): TeamMember | undefined => {
    return teamMembers.find((m) => m.id === id || m.teammateId === id);
  }, [teamMembers]);

  return (
    <TaskStoreContext.Provider
      value={{
        tasks,
        unsortedTasks,
        contacts,
        teamMembers,
        teamInvites,
        delegatedToMeTasks,
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
        delegateTaskToUser,
        undelegateTask,
        updateDelegationStatus,
        addDelegationNote,
        getDelegatedTasks,
        getDelegatedTasksByContact,
        checkOverdueTasks,
        userId,
        createTeamInvite,
        acceptTeamInvite,
        declineTeamInvite,
        removeTeamMember,
        refreshTeamData,
        refreshDelegatedToMe,
        updateDelegatedTaskStatus,
        getTeamMemberById,
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
