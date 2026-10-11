import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl, getAuthHeaders } from "@/lib/query-client";
import { scheduleOverdueNotification } from "@/lib/notifications";
import { useAuth } from "@/contexts/AuthContext";
import { apiErrorMessage } from "@/lib/alerts";

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
  type: "update" | "blocked" | "question" | "completed" | "custom" | "status_update";
  text: string;
  createdAt: Date;
  author: "owner" | "delegate";
}

// Notes as the server returns them on tasks handed to the current user.
export interface RawDelegationNote {
  id: string;
  type: DelegationNote["type"];
  text: string | null;
  createdAt: string;
  authorId: string | null;
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
  delegationNotes?: RawDelegationNote[];
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
  sortUnsortedTask: (id: string, lane: Lane) => string | null;
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
  delegateTaskToUser: (taskId: string, teammateId: string) => Promise<boolean>;
  undelegateTask: (taskId: string) => void;
  updateDelegationStatus: (taskId: string, status: DelegationStatus) => void;
  addDelegationNote: (taskId: string, type: DelegationNote["type"], text: string) => void;
  getDelegatedTasks: () => Task[];
  getDelegatedTasksByContact: (contactId: string) => Task[];
  checkOverdueTasks: () => { movedCount: number; tasks: Task[] };
  createTeamInvite: (inviteeEmail?: string) => Promise<{ invite: TeamInvite | null; error?: string }>;
  acceptTeamInvite: (inviteCode: string) => Promise<{ success: boolean; error?: string }>;
  declineTeamInvite: (inviteId: string) => Promise<boolean>;
  cancelSentInvite: (inviteId: string) => Promise<boolean>;
  resendInvite: (inviteId: string) => Promise<TeamInvite | null>;
  regenerateInvite: (inviteId: string) => Promise<TeamInvite | null>;
  removeTeamMember: (teamMemberId: string) => Promise<boolean>;
  refreshTeamData: () => Promise<void>;
  refreshDelegatedToMe: () => Promise<void>;
  refreshTasks: () => Promise<void>;
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
const TASKS_CACHE_KEY_PREFIX = "@tasks_cache_";
const CONTACTS_CACHE_KEY_PREFIX = "@contacts_cache_";
const PENDING_CREATES_KEY_PREFIX = "@pending_task_creates_";

// Delegation fields are only ever sent by the explicit hand-off actions, never
// by ordinary saves, so a stale copy of a task can't undo a hand-off.
type TaskPatch = {
  assignedTo?: string | null;
  delegatedToUserId?: string | null;
  delegationStatus?: DelegationStatus | null;
  delegatedAt?: string | null;
  lastDelegationUpdate?: string | null;
};

const TaskStoreContext = createContext<TaskStoreContext | null>(null);

export function TaskStoreProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authIsLoading, didExplicitLogout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [unsortedTasks, setUnsortedTasks] = useState<UnsortedTask[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamInvites, setTeamInvites] = useState<{ sent: TeamInvite[]; received: TeamInvite[] }>({ sent: [], received: [] });
  const [delegatedToMeTasks, setDelegatedToMeTasks] = useState<DelegatedToMeTask[]>([]);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);
  const loadingRef = React.useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const userId = user?.id || null;
  // Callbacks below are memoized; refs keep them reading the current user and
  // task list instead of whatever existed when they were created.
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;
  const tasksRef = useRef<Task[]>(tasks);
  tasksRef.current = tasks;
  const settingsModeRef = useRef(settings.mode);
  settingsModeRef.current = settings.mode;
  // Tasks created while offline, kept until the server confirms them.
  const pendingCreatesRef = useRef<Record<string, Task>>({});

  const generateId = () => {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    const randomPart2 = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomPart}-${randomPart2}`;
  };

  const getStorageKey = () => `${STORAGE_KEY_PREFIX}${userIdRef.current}`;
  const getSettingsStorageKey = () => `${SETTINGS_STORAGE_KEY_PREFIX}${userIdRef.current}`;
  const getTasksCacheKey = () => `${TASKS_CACHE_KEY_PREFIX}${userIdRef.current}`;
  const getContactsCacheKey = () => `${CONTACTS_CACHE_KEY_PREFIX}${userIdRef.current}`;
  const getPendingCreatesKey = () => `${PENDING_CREATES_KEY_PREFIX}${userIdRef.current}`;

  const persistPendingCreates = async () => {
    try {
      const serializable = Object.values(pendingCreatesRef.current).map((t) => ({
        ...t,
        createdAt: serializeDate(t.createdAt),
        dueDate: serializeDate(t.dueDate),
        completedAt: serializeDate(t.completedAt),
      }));
      await AsyncStorage.setItem(getPendingCreatesKey(), JSON.stringify(Object.fromEntries(serializable.map((t) => [t.id, t]))));
    } catch (error) {
      console.error("Failed to persist unsynced tasks:", error);
    }
  };

  useEffect(() => {
    if (authIsLoading) return;

    if (isAuthenticated && userId) {
      loadState();
    } else if (!isAuthenticated && didExplicitLogout) {
      loadingRef.current = false;
      pendingCreatesRef.current = {};
      setTasks([]);
      setUnsortedTasks([]);
      setContacts([]);
      setTeamMembers([]);
      setTeamInvites({ sent: [], received: [] });
      setDelegatedToMeTasks([]);
      setSettings(defaultSettings);
      setIsLoaded(false);
    }
  }, [isAuthenticated, userId, authIsLoading, didExplicitLogout]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        isAuthenticated &&
        userId &&
        isLoaded
      ) {
        loadFromDatabase().catch((err) =>
          console.error("Foreground refresh failed:", err)
        );
        if (settingsModeRef.current === "team") {
          refreshTeamDataRef.current();
          refreshDelegatedToMeRef.current();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, userId, isLoaded]);

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

  const noteAuthor = (n: any): DelegationNote["author"] => {
    if (n.author === "owner" || n.author === "delegate") return n.author;
    return n.authorId && n.authorId !== userIdRef.current ? "delegate" : "owner";
  };

  const parseTasksFromApi = (apiTasks: any[]): Task[] => {
    return apiTasks.map((t: any) => ({
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
      delegatedToUserId: t.delegatedToUserId || undefined,
      delegationStatus: t.delegationStatus || undefined,
      delegatedAt: parseDateOptional(t.delegatedAt),
      lastDelegationUpdate: parseDateOptional(t.lastDelegationUpdate),
      delegationNotes: (t.delegationNotes || [])
        .map((n: any) => ({
          id: n.id,
          type: n.type,
          text: n.text || "",
          createdAt: parseDate(n.createdAt),
          author: noteAuthor(n),
        }))
        .sort((a: DelegationNote, b: DelegationNote) => a.createdAt.getTime() - b.createdAt.getTime()),
    }));
  };

  const parseContactsFromApi = (apiContacts: any[]): Contact[] => {
    return apiContacts.map((c: any) => ({
      id: c.id,
      name: c.name,
      role: c.role || undefined,
      color: c.color,
      createdAt: parseDate(c.createdAt),
    }));
  };

  const cacheTasksLocally = async (taskList: Task[], contactList: Contact[]) => {
    try {
      const tasksCacheKey = getTasksCacheKey();
      const contactsCacheKey = getContactsCacheKey();
      const serializableTasks = taskList.map(t => ({
        ...t,
        createdAt: serializeDate(t.createdAt),
        dueDate: serializeDate(t.dueDate),
        completedAt: serializeDate(t.completedAt),
        delegatedAt: serializeDate(t.delegatedAt),
        lastDelegationUpdate: serializeDate(t.lastDelegationUpdate),
        delegationNotes: (t.delegationNotes || []).map(n => ({
          ...n,
          createdAt: serializeDate(n.createdAt),
        })),
      }));
      const serializableContacts = contactList.map(c => ({
        ...c,
        createdAt: serializeDate(c.createdAt),
      }));
      await AsyncStorage.setItem(tasksCacheKey, JSON.stringify(serializableTasks));
      await AsyncStorage.setItem(contactsCacheKey, JSON.stringify(serializableContacts));
    } catch (error) {
      console.error("Failed to cache tasks locally:", error);
    }
  };

  const loadCachedTasks = async (): Promise<{ tasks: Task[]; contacts: Contact[] }> => {
    try {
      const tasksCacheKey = getTasksCacheKey();
      const contactsCacheKey = getContactsCacheKey();
      const [cachedTasks, cachedContacts] = await Promise.all([
        AsyncStorage.getItem(tasksCacheKey),
        AsyncStorage.getItem(contactsCacheKey),
      ]);
      let taskList: Task[] = [];
      let contactList: Contact[] = [];
      if (cachedTasks) {
        const parsed = JSON.parse(cachedTasks);
        taskList = parseTasksFromApi(parsed);
      }
      if (cachedContacts) {
        const parsed = JSON.parse(cachedContacts);
        contactList = parseContactsFromApi(parsed);
      }
      return { tasks: taskList, contacts: contactList };
    } catch (error) {
      console.error("Failed to load cached tasks:", error);
      return { tasks: [], contacts: [] };
    }
  };

  const loadState = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

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

      // Always replace: never let a previous account's inbox carry over.
      const storedUnsorted = await AsyncStorage.getItem(storageKey);
      const parsedUnsorted = storedUnsorted ? JSON.parse(storedUnsorted) : null;
      setUnsortedTasks(Array.isArray(parsedUnsorted?.unsortedTasks) ? parsedUnsorted.unsortedTasks : []);

      const storedPending = await AsyncStorage.getItem(getPendingCreatesKey());
      const parsedPending = storedPending ? parseTasksFromApi(Object.values(JSON.parse(storedPending))) : [];
      pendingCreatesRef.current = Object.fromEntries(parsedPending.map((t) => [t.id, t]));

      const cached = await loadCachedTasks();
      setTasks(cached.tasks);
      setContacts(cached.contacts);

      await loadFromDatabase();
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load task store:", error);
      setIsLoaded(true);
    } finally {
      loadingRef.current = false;
    }
  };

  const loadFromDatabase = async (retryCount: number = 0) => {
    const MAX_RETRIES = 3;
    // Read the user from the ref: memoized callers (refreshTasks) would
    // otherwise see the user id from the render they were created in.
    const currentUserId = userIdRef.current;
    try {
      if (!currentUserId) return;

      const tasksResponse = await apiRequest("GET", `/api/tasks/${currentUserId}`);
      const tasksData = await tasksResponse.json();
      // Signed out or switched accounts while this was in flight.
      if (userIdRef.current !== currentUserId) return;

      const serverTasks = (tasksData.tasks && tasksData.tasks.length > 0)
        ? parseTasksFromApi(tasksData.tasks)
        : [];

      // Tasks created offline aren't on the server yet. Keep them (with any
      // local edits) instead of letting the server list wipe them, and retry.
      const serverIds = new Set(serverTasks.map((t) => t.id));
      const unsynced: Task[] = [];
      for (const [id, pending] of Object.entries(pendingCreatesRef.current)) {
        if (serverIds.has(id)) {
          delete pendingCreatesRef.current[id];
        } else {
          unsynced.push(tasksRef.current.find((t) => t.id === id) || pending);
        }
      }
      persistPendingCreates();
      const loadedTasks = [...unsynced, ...serverTasks];

      setTasks(loadedTasks);
      unsynced.forEach((task) => syncPendingCreate(task));

      const contactsResponse = await apiRequest("GET", `/api/contacts/${currentUserId}`);
      const contactsData = await contactsResponse.json();

      const loadedContacts = (contactsData.contacts && contactsData.contacts.length > 0)
        ? parseContactsFromApi(contactsData.contacts)
        : [];

      setContacts(loadedContacts);

      await cacheTasksLocally(loadedTasks, loadedContacts);
    } catch (error: any) {
      const is401 = error?.message?.startsWith("401");
      console.error(`Failed to load from database (attempt ${retryCount + 1}):`, error);
      if (is401) {
        console.log("Auth expired during data load — preserving local cache");
        return;
      }
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadFromDatabase(retryCount + 1);
      }
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

      if (tasks.length > 0 || contacts.length > 0) {
        await cacheTasksLocally(tasks, contacts);
      }
      // Intentionally never cache empty tasks — prevents race conditions
      // from wiping the local backup when auth is reloading
    } catch (error) {
      console.error("Failed to save local state:", error);
    }
  };

  const isClientError = (error: any) => {
    const status = Number(String(error?.message || "").slice(0, 3));
    return status >= 400 && status < 500;
  };

  const saveTaskToApi = async (task: Task, isNew: boolean = false, retryCount: number = 0): Promise<boolean> => {
    const currentUserId = userIdRef.current;
    if (!currentUserId) return false;
    const MAX_RETRIES = 3;
    if (isNew && retryCount === 0) {
      pendingCreatesRef.current[task.id] = task;
      persistPendingCreates();
    }
    try {
      if (isNew) {
        await apiRequest("POST", "/api/tasks", {
          id: task.id,
          userId: currentUserId,
          title: task.title,
          notes: task.notes,
          lane: task.lane,
          reminderType: task.reminderType,
          dueDate: task.dueDate?.toISOString(),
          assignedTo: task.assignedTo,
        });
        delete pendingCreatesRef.current[task.id];
        persistPendingCreates();
      } else {
        await apiRequest("PUT", `/api/tasks/${task.id}`, {
          title: task.title,
          notes: task.notes ?? null,
          lane: task.lane,
          reminderType: task.reminderType,
          isOverdue: task.isOverdue,
          completedAt: task.completedAt?.toISOString(),
          dueDate: task.dueDate?.toISOString() ?? null,
          focusTimeMinutes: task.focusTimeMinutes,
        });
      }
      return true;
    } catch (error: any) {
      const is401 = error?.message?.startsWith("401");
      console.error(`Failed to save task (attempt ${retryCount + 1}):`, error);
      if (!is401 && !isClientError(error) && retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return saveTaskToApi(task, isNew, retryCount + 1);
      }
      console.error("Task save failed:", task.id, task.title);
      return false;
    }
  };

  // Re-sends a task that was created offline, then pushes any later edits.
  const syncPendingCreate = async (task: Task) => {
    const created = await saveTaskToApi(task, true, 1);
    if (created && (task.completedAt || task.focusTimeMinutes > 0 || task.isOverdue)) {
      await saveTaskToApi(task);
    }
  };

  const patchTaskOnApi = async (taskId: string, patch: TaskPatch, retryCount: number = 0): Promise<boolean> => {
    const MAX_RETRIES = 3;
    try {
      await apiRequest("PUT", `/api/tasks/${taskId}`, patch);
      return true;
    } catch (error: any) {
      console.error(`Failed to update hand-off (attempt ${retryCount + 1}):`, error);
      const is401 = error?.message?.startsWith("401");
      if (!is401 && !isClientError(error) && retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return patchTaskOnApi(taskId, patch, retryCount + 1);
      }
      return false;
    }
  };

  const deleteTaskFromApi = async (taskId: string, retryCount: number = 0) => {
    const MAX_RETRIES = 3;
    try {
      await apiRequest("DELETE", `/api/tasks/${taskId}`);
    } catch (error: any) {
      const is401 = error?.message?.startsWith("401");
      console.error(`Failed to delete task (attempt ${retryCount + 1}):`, error);
      if (!is401 && retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return deleteTaskFromApi(taskId, retryCount + 1);
      }
    }
  };

  const saveSubtaskToApi = async (taskId: string, subtask: Subtask, isNew: boolean = false, retryCount: number = 0) => {
    const MAX_RETRIES = 3;
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
    } catch (error: any) {
      const is401 = error?.message?.startsWith("401");
      console.error(`Failed to save subtask (attempt ${retryCount + 1}):`, error);
      if (!is401 && retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return saveSubtaskToApi(taskId, subtask, isNew, retryCount + 1);
      }
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
    const currentUserId = userIdRef.current;
    if (!currentUserId) return;
    try {
      await apiRequest("POST", "/api/contacts", {
        id: contact.id,
        userId: currentUserId,
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
        id: note.id,
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
    const DAY = 24 * 60 * 60 * 1000;
    const endOfDay = (d: Date) => {
      const copy = new Date(d);
      copy.setHours(23, 59, 59, 999);
      return copy;
    };
    switch (lane) {
      case "now":
        return settings.laneTimings.now === "24_hours" ? new Date(now.getTime() + DAY) : endOfDay(now);
      case "soon": {
        if (settings.laneTimings.soon === "end_of_week") {
          // Through the coming Sunday; on Sunday, through next Sunday.
          const daysToSunday = (7 - now.getDay()) % 7 || 7;
          return endOfDay(new Date(now.getTime() + daysToSunday * DAY));
        }
        return new Date(now.getTime() + 3 * DAY);
      }
      case "later":
        return new Date(now.getTime() + (settings.laneTimings.later === "2_weeks" ? 14 : 7) * DAY);
      case "park":
        return new Date(now.getTime() + (settings.laneTimings.park === "quarterly" ? 90 : 30) * DAY);
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

  const sortUnsortedTask = useCallback((id: string, lane: Lane): string | null => {
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
      return newTask.id;
    }
    return null;
  }, [unsortedTasks, calculateDueDate, userId]);

  const removeUnsortedTask = useCallback((id: string) => {
    setUnsortedTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const completeTask = useCallback((id: string) => {
    const completedTask = tasksRef.current.find(t => t.id === id);
    // Completing twice would award points twice and move an old task to today.
    if (!completedTask || completedTask.completedAt) return;
    
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
    const taskToMove = tasksRef.current.find(t => t.id === id);
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
    const taskToUpdate = tasksRef.current.find(t => t.id === id);
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
    const current = tasksRef.current.find(t => t.id === taskId)?.subtasks.find(st => st.id === subtaskId);
    if (!current) return;
    const toggled = { ...current, completed: !current.completed };
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, subtasks: task.subtasks.map((st) => (st.id === subtaskId ? toggled : st)) }
          : task
      )
    );
    saveSubtaskToApi(taskId, toggled);
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
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task || minutes <= 0) return;
    const updated = { ...task, focusTimeMinutes: (task.focusTimeMinutes || 0) + minutes };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    saveTaskToApi(updated);
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
    const existing = contacts.find(c => c.id === id);
    if (!existing) return;
    const updated = { ...existing, ...updates };
    setContacts((prev) => prev.map((contact) => (contact.id === id ? updated : contact)));
    saveContactToApi(updated);
  }, [contacts]);

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
    const now = new Date();
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              assignedTo: contactId,
              delegatedToUserId: undefined,
              delegationStatus: "assigned",
              delegatedAt: now,
              lastDelegationUpdate: now,
            }
          : task
      )
    );
    patchTaskOnApi(taskId, {
      assignedTo: contactId,
      delegatedToUserId: null,
      delegationStatus: "assigned",
      delegatedAt: now.toISOString(),
      lastDelegationUpdate: now.toISOString(),
    });
  }, []);

  const undelegateTask = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              assignedTo: undefined,
              delegatedToUserId: undefined,
              delegationStatus: undefined,
              delegatedAt: undefined,
              lastDelegationUpdate: undefined,
            }
          : task
      )
    );
    patchTaskOnApi(taskId, {
      assignedTo: null,
      delegatedToUserId: null,
      delegationStatus: null,
      delegatedAt: null,
      lastDelegationUpdate: null,
    });
  }, []);

  const updateDelegationStatus = useCallback((taskId: string, status: DelegationStatus) => {
    const now = new Date();
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, delegationStatus: status, lastDelegationUpdate: now }
          : task
      )
    );
    patchTaskOnApi(taskId, { delegationStatus: status, lastDelegationUpdate: now.toISOString() });
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
    saveDelegationNoteToApi(taskId, newNote);
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

    for (const task of tasksRef.current) {
      if (task.completedAt || !task.dueDate) continue;
      const dueTime = new Date(task.dueDate).getTime();
      if (now.getTime() < dueTime) continue;
      if (task.lane === "later") {
        movedTasks.push({ ...task, lane: "soon", dueDate: calculateDueDate("soon") });
      } else if (task.lane === "soon") {
        movedTasks.push({ ...task, lane: "now", dueDate: calculateDueDate("now") });
      } else if (task.lane === "now" && !task.isOverdue) {
        const updated = { ...task, isOverdue: true };
        movedTasks.push(updated);
        newlyOverdueTasks.push(updated);
      }
    }

    if (movedTasks.length > 0) {
      const byId = new Map(movedTasks.map((t) => [t.id, t]));
      setTasks((prev) => prev.map((task) => byId.get(task.id) || task));
      movedTasks.forEach((task) => saveTaskToApi(task));
      newlyOverdueTasks.forEach((task) => {
        scheduleOverdueNotification(task.title, task.id);
      });
    }

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

  // The foreground listener is registered once; read the latest versions.
  const refreshTeamDataRef = useRef(refreshTeamData);
  refreshTeamDataRef.current = refreshTeamData;
  const refreshDelegatedToMeRef = useRef(refreshDelegatedToMe);
  refreshDelegatedToMeRef.current = refreshDelegatedToMe;

  useEffect(() => {
    if (isAuthenticated && userId && settings.mode === "team") {
      refreshTeamData();
      refreshDelegatedToMe();
    }
  }, [isAuthenticated, userId, settings.mode, refreshTeamData, refreshDelegatedToMe]);

  const createTeamInvite = useCallback(async (inviteeEmail?: string): Promise<{ invite: TeamInvite | null; error?: string }> => {
    if (!userId) return { invite: null, error: "Not logged in" };
    try {
      const response = await apiRequest("POST", "/api/team/invite", { inviterId: userId, inviteeEmail: inviteeEmail?.trim() || undefined });
      const data = await response.json();
      if (data.invite) {
        setTeamInvites((prev) => ({
          ...prev,
          sent: [...prev.sent, data.invite],
        }));
        return { invite: data.invite };
      }
      return { invite: null, error: "Failed to create invite. Please try again." };
    } catch (error) {
      console.error("Failed to create invite:", error);
      return { invite: null, error: apiErrorMessage(error, "Failed to create invite. Please try again.") };
    }
  }, [userId]);

  const acceptTeamInvite = useCallback(async (inviteCode: string): Promise<{ success: boolean; error?: string }> => {
    if (!userId) return { success: false, error: "Not logged in" };
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/team/invite/accept", baseUrl);
      const authHeaders = await getAuthHeaders();
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim().toUpperCase(), userId }),
        credentials: "include",
      });
      
      const data = await response.json();
      
      if (response.ok) {
        await refreshTeamData();
        return { success: true };
      }
      if (response.status === 429) {
        return { success: false, error: "Too many attempts. Wait a few minutes and try again." };
      }
      return { success: false, error: data.error || "Failed to join team" };
    } catch (error) {
      console.error("Failed to accept invite:", error);
      return { success: false, error: "Failed to join team" };
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

  const cancelSentInvite = useCallback(async (inviteId: string): Promise<boolean> => {
    try {
      const response = await apiRequest("DELETE", `/api/team/invite/${inviteId}`);
      if (response.ok) {
        setTeamInvites((prev) => ({
          ...prev,
          sent: prev.sent.filter((inv) => inv.id !== inviteId),
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to cancel invite:", error);
      return false;
    }
  }, []);

  const resendInvite = useCallback(async (inviteId: string): Promise<TeamInvite | null> => {
    if (!userId) return null;
    try {
      const existingInvite = teamInvites.sent.find((inv) => inv.id === inviteId);
      const response = await apiRequest("POST", `/api/team/invite/${inviteId}/resend`, { userId });
      if (response.ok) {
        const data = await response.json();
        if (data.invite) {
          setTeamInvites((prev) => ({
            ...prev,
            sent: prev.sent.map((inv) => (inv.id === inviteId ? data.invite : inv)),
          }));
        }
        return data.invite || existingInvite || null;
      }
      return existingInvite || null;
    } catch (error) {
      console.error("Failed to resend invite:", error);
      return null;
    }
  }, [userId, teamInvites.sent]);

  const regenerateInvite = useCallback(async (inviteId: string): Promise<TeamInvite | null> => {
    if (!userId) return null;
    try {
      const response = await apiRequest("POST", `/api/team/invite/${inviteId}/regenerate`, { userId });
      if (response.ok) {
        const data = await response.json();
        setTeamInvites((prev) => ({
          ...prev,
          sent: prev.sent.map((inv) => inv.id === inviteId ? data.invite : inv),
        }));
        return data.invite;
      }
      return null;
    } catch (error) {
      console.error("Failed to regenerate invite:", error);
      return null;
    }
  }, [userId]);

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

  const delegateTaskToUser = useCallback(async (taskId: string, teammateId: string): Promise<boolean> => {
    const teammate = teamMembers.find((m) => m.teammateId === teammateId);
    const original = tasksRef.current.find((t) => t.id === taskId);
    if (!teammate || !original) return false;

    const now = new Date();
    const handedOff: Task = {
      ...original,
      assignedTo: teammate.nickname || teammate.teammateName || "Teammate",
      delegatedToUserId: teammateId,
      delegationStatus: "assigned",
      delegatedAt: now,
      lastDelegationUpdate: now,
    };
    setTasks((prev) => prev.map((task) => (task.id === taskId ? handedOff : task)));

    const ok = await patchTaskOnApi(taskId, {
      assignedTo: handedOff.assignedTo,
      delegatedToUserId: teammateId,
      delegationStatus: "assigned",
      delegatedAt: now.toISOString(),
      lastDelegationUpdate: now.toISOString(),
    });
    if (!ok) {
      // Don't show a hand-off the teammate will never see.
      setTasks((prev) => prev.map((task) => (task.id === taskId ? original : task)));
    }
    return ok;
  }, [teamMembers]);

  const refreshTasks = useCallback(async (): Promise<void> => {
    if (!userIdRef.current) return;
    await loadFromDatabase();
  }, []);

  const updateDelegatedTaskStatus = useCallback(async (
    taskId: string, 
    status: DelegationStatus, 
    note?: string
  ): Promise<boolean> => {
    if (!userId) return false;
    try {
      const response = await apiRequest("PUT", `/api/delegation-status/${taskId}`, { userId, status, note });
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setDelegatedToMeTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  delegationStatus: status,
                  delegationNotes: data?.note ? [...(task.delegationNotes || []), data.note] : task.delegationNotes,
                }
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
        cancelSentInvite,
        resendInvite,
        regenerateInvite,
        removeTeamMember,
        refreshTeamData,
        refreshDelegatedToMe,
        refreshTasks,
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
