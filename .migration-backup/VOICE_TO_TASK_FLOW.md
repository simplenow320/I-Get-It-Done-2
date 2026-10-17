# Voice-to-Task Flow Documentation

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         iOS APP (TestFlight)                        │
│                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐ │
│  │ VoiceRecorder   │────▶│ QuickDumpScreen │────▶│ Task Store    │ │
│  │ (Recording)     │     │ (Orchestration) │     │ (Display)     │ │
│  └─────────────────┘     └─────────────────┘     └───────────────┘ │
│           │                       │                                 │
└───────────┼───────────────────────┼─────────────────────────────────┘
            │                       │
            ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVER (igetitdone.co)                           │
│                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐                       │
│  │ /api/transcribe │────▶│ /api/tasks/     │                       │
│  │ (Deepgram)      │     │ extract (GPT)   │                       │
│  └─────────────────┘     └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Deployment Workflow

After making code changes:

1. **Replit Publish** (top right button) - Deploys server/API to igetitdone.co
2. **Terminal on Mac:**
   ```bash
   cd ~/Downloads/I-Get-It-Done && git pull && npm install && eas build --platform ios --profile production --auto-submit
   ```

**Why both?**
- iOS app code runs on phone (TestFlight build)
- Server code runs on igetitdone.co (Replit publish)

---

## Step 1: Voice Recording (iOS App)

**File:** `client/components/VoiceRecorder.tsx`

### Key Flow:
1. User taps mic button
2. Request microphone permission
3. Record audio using expo-audio
4. Upload to server for transcription

```typescript
// Recording starts
const actuallyStartRecording = async () => {
  await setAudioModeAsync({
    allowsRecording: true,
    playsInSilentMode: true,
  });

  await audioRecorder.prepareToRecordAsync();
  recordingStartTimeRef.current = Date.now();
  audioRecorder.record();
  
  setState("recording");
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};
```

### Transcription Upload:
```typescript
const transcribeAudio = async (uri: string, durationSeconds: number) => {
  const apiUrl = getApiUrl();
  const uploadUrl = `${apiUrl}/api/transcribe`;
  
  const authToken = await getStoredAuthToken();
  
  const headers: Record<string, string> = {};
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  
  const response = await uploadAsync(uploadUrl, uri, {
    fieldName: "audio",
    httpMethod: "POST",
    uploadType: FileSystemUploadType.MULTIPART,
    mimeType: "audio/m4a",
    headers,
    parameters: {
      userId: userId || "",
      durationSeconds: String(durationSeconds),
    },
  });

  const data = JSON.parse(response.body);
  
  if (data.text && data.text.trim()) {
    onTranscriptionComplete(data.text.trim());
  }
};
```

---

## Step 2: Audio Transcription (Server)

**File:** `server/routes.ts`

**Endpoint:** `POST /api/transcribe`

### Flow:
1. Receive audio file
2. Check daily voice usage limit (600 seconds)
3. Send to Deepgram API for transcription
4. Return text transcript

```typescript
app.post("/api/transcribe", requireAuth, upload.single("audio"), async (req, res) => {
  const userId = req.user?.userId;
  const durationSeconds = parseInt(req.body.durationSeconds) || 0;
  
  // Check daily limit
  const today = new Date().toISOString().split('T')[0];
  const existing = await db.select().from(voiceUsage)
    .where(and(eq(voiceUsage.userId, userId), eq(voiceUsage.date, today)))
    .limit(1);
  
  const currentUsage = existing.length > 0 ? existing[0].secondsUsed || 0 : 0;
  
  if (currentUsage + durationSeconds > DAILY_VOICE_LIMIT_SECONDS) {
    return res.status(429).json({ error: "Daily voice limit reached" });
  }

  // Send to Deepgram
  const apiKey = process.env.DEEPGRAM_API_KEY;
  const audioBuffer = fs.readFileSync(req.file.path);
  
  const response = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&detect_language=true",
    {
      method: "POST",
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "audio/mp4",
      },
      body: audioBuffer,
    }
  );

  const result = await response.json();
  const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
  
  // Update usage
  await db.update(voiceUsage).set({ 
    secondsUsed: currentUsage + durationSeconds,
  });
  
  res.json({ text: transcript });
});
```

---

## Step 3: Task Extraction (iOS App → Server)

**File:** `client/screens/QuickDumpScreen.tsx`

### iOS Calls Server:
```typescript
const handleVoiceTranscription = useCallback(async (text: string) => {
  setIsExtracting(true);
  
  try {
    // CRITICAL: Uses apiRequest which includes auth token
    const response = await apiRequest("POST", "/api/tasks/extract", { transcript: text });
    const data = await response.json();
    const tasks = data.tasks || [];

    if (tasks.length > 0) {
      tasks.forEach((task: { title: string }) => {
        addUnsortedTask(task.title);
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // NO FALLBACK - if AI returns empty, we don't add raw text
  } catch (error) {
    console.error("Task extraction error:", error);
    // NO FALLBACK - don't add raw text on error
  } finally {
    setIsExtracting(false);
  }
}, [addUnsortedTask]);
```

### apiRequest Helper (includes auth):
**File:** `client/lib/query-client.ts`

```typescript
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getStoredAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);
  const authHeaders = await getAuthHeaders();

  const res = await fetch(url, {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  return res;
}
```

---

## Step 4: AI Task Extraction (Server)

**File:** `server/routes.ts`

**Endpoint:** `POST /api/tasks/extract`

### Flow:
1. Receive transcript text
2. Send to GPT-4o-mini with extraction prompt
3. Return only actionable tasks (filters out filler/meta-commentary)

```typescript
app.post("/api/tasks/extract", requireAuth, async (req, res) => {
  const { transcript } = req.body;

  const apiKey = process.env.OPENAI_API_KEY;
  
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Extract FUTURE to-do tasks only. Ignore everything else.

A TO-DO TASK is something the user NEEDS TO DO LATER - NOT what they're doing right now.

EXTRACT (future actions):
- "I need to call mom" → Call mom
- "Pick up groceries" → Pick up groceries  
- "Email the landlord about the lease" → Email landlord about lease

IGNORE (not tasks):
- Narration about recording: "I'm going to test", "let me try", "I'm recording"
- What they're doing now: "I'm going to say some things", "I'll talk about"
- Meta-commentary: "ok so", "anyway", "let's see", "alright"
- Random speech: "since Dawn is up", "I can still talk"
- Observations: "it's cold", "that's interesting"
- Uncertainty: "maybe", "not sure", "I might"

Key test: Would this go on a paper to-do list? If no, ignore it.

Return JSON only: {"tasks": [{"title": "Task"}]}

Examples:
"So since Dawn is still up I can still talk and I'm going to test the microphone" → {"tasks": []}
"I need to pick up Chinese food and call my mom" → {"tasks": [{"title": "Pick up Chinese food"}, {"title": "Call mom"}]}
"Ok I'm gonna say a few random things then try to add a new user" → {"tasks": []}`
        },
        {
          role: "user",
          content: transcript
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" }
    }),
  });

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;

  const parsed = JSON.parse(content);
  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  
  res.json({ tasks: tasks.filter((t) => t.title && typeof t.title === "string") });
});
```

---

## Key Files Summary

| File | Purpose |
|------|---------|
| `client/components/VoiceRecorder.tsx` | Records audio, uploads to `/api/transcribe` |
| `client/screens/QuickDumpScreen.tsx` | Receives transcript, calls `/api/tasks/extract`, displays tasks |
| `client/lib/query-client.ts` | `apiRequest` helper with auth headers |
| `client/lib/api-url.ts` | Returns `https://igetitdone.co` for iOS |
| `server/routes.ts` | `/api/transcribe` (Deepgram) and `/api/tasks/extract` (GPT-4o-mini) |

---

## Critical Bug Fixes (Build 20)

### Bug 1: Missing Auth Token
**Problem:** iOS app was calling `/api/tasks/extract` without auth token
**Fix:** Use `apiRequest` helper instead of raw `fetch`

```typescript
// WRONG (no auth)
const response = await fetch(`${apiUrl}/api/tasks/extract`, { ... });

// CORRECT (with auth)
const response = await apiRequest("POST", "/api/tasks/extract", { transcript: text });
```

### Bug 2: Raw Text Fallback
**Problem:** When AI returned empty results, raw transcript was added as a task
**Fix:** Only add tasks if AI returns them, never fall back to raw text

```typescript
// WRONG (adds raw text)
} catch (error) {
  addUnsortedTask(text);  // BAD - adds "I'm testing the mic" as a task
}

// CORRECT (no fallback)
} catch (error) {
  console.error("Task extraction error:", error);
  // Silent fail - don't add junk tasks
}
```

---

## API Keys Required (Server)

| Key | Service | Purpose |
|-----|---------|---------|
| `DEEPGRAM_API_KEY` | Deepgram | Audio transcription |
| `OPENAI_API_KEY` | OpenAI | GPT-4o-mini task extraction |
