import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import * as fs from "fs";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, tasks, subtasks, contacts, delegationNotes, userStats } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

const upload = multer({ 
  dest: "/tmp/audio-uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.post("/api/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const apiKey = process.env.DEEPGRAM_API_KEY;
      if (!apiKey) {
        console.error("DEEPGRAM_API_KEY not configured");
        return res.status(500).json({ error: "Transcription service not configured" });
      }

      const audioFilePath = req.file.path;
      const audioBuffer = fs.readFileSync(audioFilePath);
      
      console.log("Sending audio to Deepgram, size:", audioBuffer.length, "bytes");

      const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "audio/m4a",
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Deepgram error:", response.status, errorText);
        throw new Error(`Deepgram API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Deepgram response:", JSON.stringify(result, null, 2));

      fs.unlink(audioFilePath, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });

      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      
      res.json({ text: transcript });
    } catch (error: any) {
      console.error("Transcription error:", error);
      
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }

      if (error.status === 401) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      
      const result = await db.insert(users).values({
        email: normalizedEmail,
        passwordHash,
      }).returning();
      
      const user = result[0];
      
      await db.insert(userStats).values({
        userId: user.id,
      });
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email,
          createdAt: user.createdAt,
        } 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (existing.length === 0) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const user = existing[0];
      
      if (!user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      res.json({ 
        user: { 
          id: user.id, 
          email: user.email,
          createdAt: user.createdAt,
        } 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/users/init", async (req: Request, res: Response) => {
    try {
      const { deviceId } = req.body;
      
      let user = null;
      if (deviceId) {
        const existing = await db.select().from(users).where(eq(users.deviceId, deviceId)).limit(1);
        if (existing.length > 0) {
          user = existing[0];
        }
      }
      
      if (!user) {
        const result = await db.insert(users).values({
          deviceId: deviceId || null,
          email: null,
        }).returning();
        user = result[0];
        
        await db.insert(userStats).values({
          userId: user.id,
        });
      }
      
      res.json({ user });
    } catch (error) {
      console.error("User init error:", error);
      res.status(500).json({ error: "Failed to initialize user" });
    }
  });

  app.get("/api/tasks/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      const userTasks = await db.select().from(tasks).where(eq(tasks.userId, userId));
      
      const taskIds = userTasks.map(t => t.id);
      let taskSubtasks: any[] = [];
      let taskNotes: any[] = [];
      
      if (taskIds.length > 0) {
        taskSubtasks = await db.select().from(subtasks).where(inArray(subtasks.taskId, taskIds));
        taskNotes = await db.select().from(delegationNotes).where(inArray(delegationNotes.taskId, taskIds));
      }
      
      const tasksWithDetails = userTasks.map(task => ({
        ...task,
        subtasks: taskSubtasks.filter(st => st.taskId === task.id),
        delegationNotes: taskNotes.filter(n => n.taskId === task.id),
      }));
      
      res.json({ tasks: tasksWithDetails });
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Failed to get tasks" });
    }
  });

  app.post("/api/tasks", async (req: Request, res: Response) => {
    try {
      const { id, userId, title, notes, lane, reminderType, dueDate, assignedTo } = req.body;
      
      const taskValues: any = {
        userId,
        title,
        notes: notes || null,
        lane: lane || "now",
        reminderType: reminderType || "soft",
        dueDate: dueDate ? new Date(dueDate) : null,
        assignedTo: assignedTo || null,
      };
      
      if (id) {
        taskValues.id = id;
      }
      
      const result = await db.insert(tasks).values(taskValues).returning();
      
      res.json({ task: { ...result[0], subtasks: [], delegationNotes: [] } });
    } catch (error) {
      console.error("Create task error:", error);
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);
      if (updates.completedAt) updates.completedAt = new Date(updates.completedAt);
      if (updates.delegatedAt) updates.delegatedAt = new Date(updates.delegatedAt);
      if (updates.lastDelegationUpdate) updates.lastDelegationUpdate = new Date(updates.lastDelegationUpdate);
      
      delete updates.subtasks;
      delete updates.delegationNotes;
      delete updates.createdAt;
      
      const result = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json({ task: result[0] });
    } catch (error) {
      console.error("Update task error:", error);
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(tasks).where(eq(tasks.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  app.post("/api/subtasks", async (req: Request, res: Response) => {
    try {
      const { id, taskId, title } = req.body;
      
      const subtaskValues: any = {
        taskId,
        title,
        completed: false,
      };
      
      if (id) {
        subtaskValues.id = id;
      }
      
      const result = await db.insert(subtasks).values(subtaskValues).returning();
      
      res.json({ subtask: result[0] });
    } catch (error) {
      console.error("Create subtask error:", error);
      res.status(500).json({ error: "Failed to create subtask" });
    }
  });

  app.put("/api/subtasks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { completed, title } = req.body;
      
      const updates: any = {};
      if (completed !== undefined) updates.completed = completed;
      if (title !== undefined) updates.title = title;
      
      const result = await db.update(subtasks).set(updates).where(eq(subtasks.id, id)).returning();
      
      res.json({ subtask: result[0] });
    } catch (error) {
      console.error("Update subtask error:", error);
      res.status(500).json({ error: "Failed to update subtask" });
    }
  });

  app.delete("/api/subtasks/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(subtasks).where(eq(subtasks.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete subtask error:", error);
      res.status(500).json({ error: "Failed to delete subtask" });
    }
  });

  app.get("/api/contacts/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const userContacts = await db.select().from(contacts).where(eq(contacts.userId, userId));
      res.json({ contacts: userContacts });
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ error: "Failed to get contacts" });
    }
  });

  app.post("/api/contacts", async (req: Request, res: Response) => {
    try {
      const { id, userId, name, role, color } = req.body;
      
      const contactValues: any = {
        userId,
        name,
        role: role || null,
        color: color || "#007AFF",
      };
      
      if (id) {
        contactValues.id = id;
      }
      
      const result = await db.insert(contacts).values(contactValues).returning();
      
      res.json({ contact: result[0] });
    } catch (error) {
      console.error("Create contact error:", error);
      res.status(500).json({ error: "Failed to create contact" });
    }
  });

  app.delete("/api/contacts/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await db.delete(contacts).where(eq(contacts.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete contact error:", error);
      res.status(500).json({ error: "Failed to delete contact" });
    }
  });

  app.post("/api/delegation-notes", async (req: Request, res: Response) => {
    try {
      const { taskId, type, text } = req.body;
      
      const result = await db.insert(delegationNotes).values({
        taskId,
        type,
        text: text || null,
      }).returning();
      
      res.json({ note: result[0] });
    } catch (error) {
      console.error("Create delegation note error:", error);
      res.status(500).json({ error: "Failed to create delegation note" });
    }
  });

  app.put("/api/users/:id/push-token", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { pushToken, notificationsEnabled } = req.body;
      
      const updates: any = {};
      if (pushToken !== undefined) updates.pushToken = pushToken;
      if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;
      
      const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json({ user: result[0] });
    } catch (error) {
      console.error("Update push token error:", error);
      res.status(500).json({ error: "Failed to update push token" });
    }
  });

  app.get("/api/stats/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const stats = await db.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
      
      if (stats.length === 0) {
        const result = await db.insert(userStats).values({ userId }).returning();
        return res.json({ stats: result[0] });
      }
      
      res.json({ stats: stats[0] });
    } catch (error) {
      console.error("Get stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.put("/api/stats/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      delete updates.id;
      delete updates.userId;
      
      if (updates.lastActiveDate) updates.lastActiveDate = updates.lastActiveDate;
      
      const result = await db.update(userStats).set(updates).where(eq(userStats.userId, userId)).returning();
      
      if (result.length === 0) {
        const inserted = await db.insert(userStats).values({ userId, ...updates }).returning();
        return res.json({ stats: inserted[0] });
      }
      
      res.json({ stats: result[0] });
    } catch (error) {
      console.error("Update stats error:", error);
      res.status(500).json({ error: "Failed to update stats" });
    }
  });

  app.post("/api/sync", async (req: Request, res: Response) => {
    try {
      const { userId, tasks: clientTasks, contacts: clientContacts, stats: clientStats } = req.body;
      
      for (const task of clientTasks || []) {
        const existing = await db.select().from(tasks).where(eq(tasks.id, task.id)).limit(1);
        
        if (existing.length === 0) {
          await db.insert(tasks).values({
            id: task.id,
            userId,
            title: task.title,
            notes: task.notes || null,
            lane: task.lane,
            reminderType: task.reminderType || "soft",
            focusTimeMinutes: task.focusTimeMinutes || 0,
            isOverdue: task.isOverdue || false,
            createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
            completedAt: task.completedAt ? new Date(task.completedAt) : null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            assignedTo: task.assignedTo || null,
            delegationStatus: task.delegationStatus || null,
            delegatedAt: task.delegatedAt ? new Date(task.delegatedAt) : null,
            lastDelegationUpdate: task.lastDelegationUpdate ? new Date(task.lastDelegationUpdate) : null,
          });
          
          for (const st of task.subtasks || []) {
            await db.insert(subtasks).values({
              id: st.id,
              taskId: task.id,
              title: st.title,
              completed: st.completed || false,
            }).onConflictDoNothing();
          }
          
          for (const note of task.delegationNotes || []) {
            await db.insert(delegationNotes).values({
              id: note.id,
              taskId: task.id,
              type: note.type,
              text: note.text || null,
              createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
            }).onConflictDoNothing();
          }
        }
      }
      
      for (const contact of clientContacts || []) {
        const existing = await db.select().from(contacts).where(eq(contacts.id, contact.id)).limit(1);
        
        if (existing.length === 0) {
          await db.insert(contacts).values({
            id: contact.id,
            userId,
            name: contact.name,
            role: contact.role || null,
            color: contact.color || "#007AFF",
            createdAt: contact.createdAt ? new Date(contact.createdAt) : new Date(),
          });
        }
      }
      
      if (clientStats) {
        await db.insert(userStats).values({
          userId,
          ...clientStats,
          lastActiveDate: clientStats.lastActiveDate || null,
        }).onConflictDoUpdate({
          target: userStats.userId,
          set: clientStats,
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to sync data" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
