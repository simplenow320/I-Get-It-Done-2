# I GET IT DONE

## Overview
A premium ADHD-optimized mobile task management app that helps users stay focused, start tasks, finish tasks, and avoid overwhelm. Built on research-backed insights about how ADHD brains work: fast, intuitive, idea-heavy, easily overloaded, and motivated by small wins, structure, and clear feedback.

## Current State
- **Phase**: ADHD Feature Implementation
- **Status**: Core 4-lane system complete, implementing ADHD-specific features
- **Design**: Premium iOS 26-inspired liquid glass design with bold gradients

## ADHD Problems This App Solves
- Time blindness → Focus timers, countdown rings, auto-move
- Task initiation trouble → Break It Down, sprint timers, Quick Dump
- Overwhelm from big tasks → Subtasks, progress bars, chunking
- Difficulty estimating effort → Time windows instead of exact deadlines
- Losing track of priorities → Auto-lane movement, gentle nudges
- Low dopamine → Streaks, completion animations, micro-wins
- Working memory issues → Quick capture, layered reminders

## Architecture

### Technology Stack
- **Frontend**: React Native with Expo SDK 54
- **Backend**: Express.js (prepared for persistence)
- **Database**: PostgreSQL (schema ready for integration)
- **State Management**: React Context API (TaskStore)

### Core Concept - The 4-Lane System
| Lane | Purpose | ADHD Benefit |
|------|---------|--------------|
| **Now** | Tasks for today | Short list reduces overwhelm |
| **Soon** | Next few days | Short horizon without sudden pressure |
| **Later** | Future weeks | Keeps tasks visible, out of today's mental space |
| **Park** | Set aside for later | Safe holding zone for idea-heavy brains |

### Navigation Structure
```
RootStackNavigator
├── Landing (Marketing page)
├── Onboarding
│   ├── Welcome
│   ├── LaneSetup
│   └── ModeSelection
└── Main (Tab Navigator)
    ├── Dashboard Tab
    │   ├── Dashboard (4-lane overview + Quick Dump button)
    │   ├── LaneDetail
    │   ├── AddTask
    │   ├── TaskDetail
    │   └── QuickDump (NEW - Brain dump modal)
    ├── Focus Tab (NEW - replaces Now Tab)
    │   ├── FocusMode (One task at a time)
    │   └── FocusTimer (Sprint timer overlay)
    └── Profile Tab
        ├── Profile (Stats + Gamification)
        └── WeeklyReset (Enhanced with wins)
```

## ADHD Feature Implementation Plan

### Phase 1: Enhanced Task Model & Quick Capture
**Goal**: Enable rapid task entry and subtask management

1. **Extended Task Model**
   ```typescript
   interface Task {
     id: string;
     title: string;
     notes?: string;
     lane: Lane;
     createdAt: Date;
     dueDate?: Date;
     completedAt?: Date;
     assignedTo?: string;
     // NEW ADHD fields
     subtasks: Subtask[];
     reminderType: 'soft' | 'strong' | 'persistent' | 'none';
     focusTime?: number; // minutes spent in focus mode
     isOverdue: boolean;
   }
   
   interface Subtask {
     id: string;
     title: string;
     completed: boolean;
   }
   ```

2. **Quick Dump Screen**
   - Large prominent button on dashboard
   - Rapid-fire text entry
   - Tasks land in "Unsure" state for later sorting
   - Guided lane selection one-by-one

3. **Brain Dump Sorting Flow**
   - One task at a time presentation
   - Swipe or tap to assign lane
   - Skip option for later

### Phase 2: Task Chunking & Progress
**Goal**: Make big tasks feel doable

1. **Break It Down Feature**
   - "Break It Down" button on each task
   - Add custom subtasks
   - Visual progress bar showing completion %
   - Each subtask completion = dopamine hit

2. **Progress Visualization**
   - Circular progress ring on task cards
   - Animated fill as subtasks complete
   - Confetti/glow on full completion

### Phase 3: Focus Mode & Timer
**Goal**: Combat time blindness and support hyperfocus

1. **Daily Focus Mode Screen**
   - Shows only Now tasks
   - One task at a time view option
   - Swipe to complete or defer
   - Launch focus timer directly

2. **Focus Timer (Sprint Mode)**
   - Preset options: 10, 15, 25, custom minutes
   - Visual countdown ring
   - Haptic feedback at intervals
   - Celebratory message on completion
   - "Want another sprint?" prompt

### Phase 4: Gamification & Motivation
**Goal**: Sustain motivation with micro-rewards

1. **Streak System**
   - "Days you cleared Now" counter
   - Streak badge on dashboard
   - Streak protection for one missed day

2. **Completion Celebrations**
   - Confetti animation on task complete
   - Points for completing chunks
   - Level badges (Starter → Focused → Unstoppable)

3. **Stats & Achievements**
   - Weekly task completion count
   - Total focus minutes
   - Longest streak
   - Current level progress

### Phase 5: Enhanced Weekly Reset
**Goal**: Provide structure and feedback loops

1. **Wins Section**
   - Show all completed tasks (dopamine booster)
   - Highlight streaks maintained

2. **Auto-Move Summary**
   - Tasks that moved between lanes
   - Overdue items flagged gently

3. **Cleanup Suggestions**
   - Stale Park items to review
   - Tasks stuck in Soon too long

4. **Future Planning**
   - Quick look at next week
   - Optional goal setting

### Phase 6: Delegation (Future)
**Goal**: Reduce mental load through hand-off

1. **Contact Management**
   - Add people during onboarding
   - Simple contact list

2. **Hand-Off Flow**
   - "Hand-off" button on tasks
   - Choose a person
   - Track progress

## File Structure
```
client/
├── App.tsx
├── components/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBoundary.tsx
│   ├── FloatingAddButton.tsx
│   ├── HeaderTitle.tsx
│   ├── KeyboardAwareScrollViewCompat.tsx
│   ├── LaneCard.tsx
│   ├── LaneSelector.tsx
│   ├── ProgressRing.tsx          # NEW
│   ├── QuickDumpButton.tsx       # NEW
│   ├── Spacer.tsx
│   ├── StreakBadge.tsx           # NEW
│   ├── SubtaskItem.tsx           # NEW
│   ├── TaskCard.tsx
│   ├── ThemedText.tsx
│   ├── ThemedView.tsx
│   └── TimerRing.tsx             # NEW
├── constants/
│   └── theme.ts
├── contexts/
│   └── ThemeContext.tsx
├── hooks/
│   ├── useScreenOptions.ts
│   └── useTheme.ts
├── navigation/
│   ├── DashboardStackNavigator.tsx
│   ├── FocusStackNavigator.tsx   # NEW
│   ├── MainTabNavigator.tsx
│   ├── OnboardingStackNavigator.tsx
│   ├── ProfileStackNavigator.tsx
│   └── RootStackNavigator.tsx
├── screens/
│   ├── AddTaskScreen.tsx
│   ├── DashboardScreen.tsx
│   ├── FocusModeScreen.tsx       # NEW
│   ├── FocusTimerScreen.tsx      # NEW
│   ├── LandingScreen.tsx
│   ├── LaneDetailScreen.tsx
│   ├── LaneSetupScreen.tsx
│   ├── ModeSelectionScreen.tsx
│   ├── NowScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── QuickDumpScreen.tsx       # NEW
│   ├── TaskDetailScreen.tsx
│   ├── WeeklyResetScreen.tsx
│   └── WelcomeScreen.tsx
└── stores/
    ├── GamificationStore.tsx     # NEW
    └── TaskStore.tsx
```

## Design System

### Lane Colors
- **Now** (Urgent Red): #FF3B30 → #FF6B60
- **Soon** (Action Orange): #FF9500 → #FFB340
- **Later** (Calm Blue): #007AFF → #4DA6FF
- **Park** (Neutral Purple): #AF52DE → #C77EEA

### Typography
- Hero Numbers: 72px, weight 700
- Large Title: 34px, weight 700
- Headlines: 17-28px, weight 600
- Body: 17px, weight 400

### Visual Elements
- Border Radius: 8-24px scale
- Spacing: 4-40px scale
- Haptic feedback on interactions
- Spring animations for smooth transitions
- Confetti animations for celebrations

## Backend Schema (Prepared for Future)
```sql
-- Tasks with ADHD fields
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  notes TEXT,
  lane VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  assigned_to UUID REFERENCES users(id),
  reminder_type VARCHAR(20) DEFAULT 'soft',
  focus_time_minutes INTEGER DEFAULT 0,
  is_overdue BOOLEAN DEFAULT FALSE
);

-- Subtasks for chunking
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Gamification tracking
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  total_focus_minutes INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  points INTEGER DEFAULT 0
);

-- Focus sessions
CREATE TABLE focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  task_id UUID REFERENCES tasks(id),
  duration_minutes INTEGER NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW()
);
```

## Recent Changes
- **Dec 8, 2025**: Initial MVP with 4-lane system, onboarding, dashboard
- **Dec 8, 2025**: Added light/dark mode toggle with persistence
- **Dec 8, 2025**: Created marketing landing page
- **Dec 8, 2025**: Planning ADHD-optimized feature implementation

## User Preferences
- Premium, modern aesthetic (Apple meets ESPN)
- No emojis in the UI
- Minimalist design with bold color accents
- Focus on productivity and quick interactions
- ADHD-friendly: reduced decision fatigue, clear feedback

## Current Implementation Priority
1. Quick Dump button + screen
2. Enhanced Task model with subtasks
3. Break It Down feature with progress bars
4. Focus Mode (single task view)
5. Focus Timer with countdown ring
6. Streak tracking + dashboard badge
7. Completion celebrations
8. Enhanced Weekly Reset
