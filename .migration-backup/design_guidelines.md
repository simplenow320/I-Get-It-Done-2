# I GET IT DONE - Design Guidelines

## Architecture Decisions

### Authentication
**Auth Required** - App supports Team mode with task delegation
- **Implementation**: Apple Sign-In (primary) + Google Sign-In for cross-platform
- **Onboarding Flow**: 
  1. Welcome screen → Lane timing setup → Solo/Team mode selection → Auth (if Team selected)
  2. Solo mode: Skip auth, proceed to dashboard with local profile
  3. Team mode: Required SSO, then team member invitation
- **Profile Screen**: Custom avatar selection (6 preset avatars: bold, geometric shapes in brand colors), display name, notification preferences, lane timing adjustments

### Navigation Structure
**Tab Navigation (4 tabs)** + Floating Action Button
- **Tabs** (left to right):
  1. **Dashboard** (Home icon) - Overview of all four lanes
  2. **Now** (Lightning bolt icon) - Today's focus tasks
  3. **Team** (People icon) - Hand-off management (Team mode only) / Settings (Solo mode)
  4. **Profile** (User icon) - Account, stats, weekly reset
- **Floating Action Button**: Center-positioned "+" button for quick task creation, elevated above tab bar with shadow (shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.10, shadowRadius: 2)

---

## Screen Specifications

### 1. Onboarding Flow (Stack-Only)

#### Welcome Screen
- **Purpose**: Brand introduction and value proposition
- **Layout**:
  - Header: Transparent, no navigation
  - Content: Full-screen, non-scrollable, centered
  - Large app wordmark "I GET IT DONE" at top third
  - Three-word tagline: "Now. Soon. Done."
  - CTA button at bottom: "Get Started" (full-width, rounded corners 16px)
- **Safe Area**: Top: insets.top + 60px, Bottom: insets.bottom + 40px
- **Components**: Animated lane preview cards stacking vertically

#### Lane Timing Setup
- **Purpose**: Configure default time windows for each lane
- **Layout**:
  - Header: Custom, "Setup Your Pace" title, progress indicator (1/2)
  - Content: Scrollable form with 4 sections (Now/Soon/Later/Park)
  - Each section: Lane name (bold), description, segmented control for timing options
- **Safe Area**: Top: headerHeight + 24px, Bottom: insets.bottom + 100px
- **Components**: 
  - Segmented controls (iOS native style)
  - "Continue" button floats at bottom (full-width minus 32px margin)

#### Mode Selection
- **Purpose**: Choose Solo or Team mode
- **Layout**:
  - Header: Custom, "Choose Your Mode" title, progress indicator (2/2)
  - Content: Non-scrollable, two large option cards (50% height each minus spacing)
  - Card design: Icon, mode name, 2-line description
- **Safe Area**: Top: headerHeight + 24px, Bottom: insets.bottom + 40px
- **Components**: Tappable cards with scale animation on press

### 2. Dashboard (Tab 1)

#### Main Dashboard
- **Purpose**: At-a-glance view of all four lanes with task counts
- **Layout**:
  - Header: Transparent, large title "Dashboard", right button (Weekly Reset icon)
  - Content: Non-scrollable grid (2x2 lane cards)
  - Each card: 48% width, aspect ratio 1.1:1, vertical spacing 16px
- **Safe Area**: Top: headerHeight + 40px, Bottom: tabBarHeight + 24px
- **Components**:
  - **Lane Cards** (ordered: Now top-left, Soon top-right, Later bottom-left, Park bottom-right)
    - Card structure: Lane name (large, bold), task count (huge number), status bar (progress indicator)
    - Tap animation: Scale down 0.97, then navigate to lane detail
    - Card colors: Distinct gradients (see Design System)

### 3. Task Creation Modal (Native Modal)

#### Add Task Sheet
- **Purpose**: Rapid task entry with lane assignment
- **Layout**:
  - Header: Custom modal header, "New Task" title, left "Cancel", right "Add" (disabled until valid)
  - Content: Form with title input (large text field), optional notes (smaller, expandable), lane selector (4 buttons in horizontal scroll)
- **Safe Area**: Top: 20px, Bottom: insets.bottom + 24px
- **Components**:
  - Auto-focus title field on appear
  - Lane selector: 4 pill-shaped buttons, single-select, visual feedback with fill animation
  - Keyboard-aware scroll view

### 4. Lane Detail Screens (Stack within Dashboard tab)

#### Now / Soon / Later / Park Views
- **Purpose**: Display tasks within specific lane with actions
- **Layout**:
  - Header: Default navigation, lane name as title, right button (Filter icon for Soon/Later/Park)
  - Content: Scrollable list of task cards
  - Empty state: Centered icon + encouraging message
- **Safe Area**: Top: 24px, Bottom: tabBarHeight + 100px (for floating complete-all button if applicable)
- **Components**:
  - **Task Cards**: 
    - Full-width minus 32px horizontal padding
    - Vertical spacing 12px between cards
    - Left swipe: Complete action (green background reveal)
    - Right swipe: Move to another lane (blue background reveal)
    - Card content: Task title (bold, 17px), optional note (gray, 14px), due window indicator (subtle pill)
  - **"Now" View Only**: "Complete All" floating button at bottom (if >3 tasks)

### 5. Task Detail Modal (Native Modal)

#### Single Task View
- **Purpose**: View/edit task, add notes, hand off, or change lane
- **Layout**:
  - Header: Custom modal header, task title (editable on tap), left "Close", right "Save"
  - Content: Scrollable form with sections: Title, Notes (multiline), Due Window (display only), Current Lane, Actions
- **Safe Area**: Top: 20px, Bottom: insets.bottom + 24px
- **Components**:
  - Actions section: "Move to..." (shows 3 other lanes), "Hand-off" (Team mode only), "Delete" (destructive, confirmation alert)

### 6. Weekly Reset Screen (Stack within Profile tab)

#### Reset Summary
- **Purpose**: Review completed tasks and lane movements
- **Layout**:
  - Header: Default navigation, "This Week" title
  - Content: Scrollable sections with animations
  - Sections: Completed Count (hero number), Lane Movement Cards (visual arrows), Stuck Tasks Alert, "Start Fresh" button
- **Safe Area**: Top: 24px, Bottom: tabBarHeight + 40px
- **Components**:
  - Completion celebration: Confetti animation if >10 tasks completed
  - Lane movement: Animated cards showing task flow between lanes

---

## Design System

### Color Palette
**Premium, bold, energetic - Apple meets ESPN**

**Primary Colors**:
- **Now (Urgent Red)**: #FF3B30 (iOS red, high energy)
- **Soon (Action Orange)**: #FF9500 (vibrant, ESPN-inspired)
- **Later (Calm Blue)**: #007AFF (iOS blue, trustworthy)
- **Park (Neutral Purple)**: #AF52DE (creative, contemplative)

**Gradients** (for lane cards):
- Now: Linear from #FF3B30 to #FF6B60
- Soon: Linear from #FF9500 to #FFB340
- Later: Linear from #007AFF to #4DA6FF
- Park: Linear from #AF52DE to #C77EEA

**Neutrals**:
- Background: #F5F5F7 (light mode), #000000 (dark mode)
- Card Background: #FFFFFF (light), #1C1C1E (dark)
- Text Primary: #000000 (light), #FFFFFF (dark)
- Text Secondary: #8E8E93 (light), #AEAEB2 (dark)
- Borders: #E5E5EA (light), #38383A (dark)

**Feedback Colors**:
- Success: #34C759
- Warning: #FF9500
- Error: #FF3B30

### Typography
**SF Pro (iOS) / Roboto (Android)**

**Hierarchy**:
- **Hero Numbers** (task counts): 72px, weight 700, tight spacing
- **Large Title**: 34px, weight 700
- **Title 1**: 28px, weight 600
- **Title 2**: 22px, weight 600
- **Headline**: 17px, weight 600
- **Body**: 17px, weight 400
- **Subheadline**: 15px, weight 400
- **Caption**: 12px, weight 400

**Special Styling**:
- App wordmark "I GET IT DONE": Custom letterspacing +1.2px, all caps, weight 800
- Lane names: Always bold (weight 600+), high contrast

### Visual Design Rules

**Spacing Scale**:
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 40px

**Corner Radius**:
- Cards: 16px
- Buttons: 12px
- Pills/Tags: 20px
- Modals: 20px (top corners only)

**Shadows** (use sparingly):
- Floating buttons only: {offset: {width: 0, height: 2}, opacity: 0.10, radius: 2}
- Elevated cards (Now view): {offset: {width: 0, height: 4}, opacity: 0.08, radius: 6}

**Animations**:
- Default transitions: 300ms ease-out
- Button press: Scale to 0.97, 100ms
- Card tap: Scale to 0.98, 150ms
- Swipe actions: Spring animation (damping 0.8)
- Lane card entry: Staggered fade-in, 100ms delay between cards

**Icons**:
- Use SF Symbols (iOS) / Material Icons (Android) for system actions
- Use Feather icons (@expo/vector-icons) for custom app icons
- Sizing: 20px (small), 24px (standard), 32px (large)
- Never use emojis

**Interactive States**:
- All touchables: Opacity 0.6 on press OR scale animation
- Buttons: Background color darkens 10% on press
- Cards: Subtle scale (0.98) + shadow increase on press
- Swipe reveals: Smooth background color transition

### Accessibility
- Minimum touch target: 44x44px
- Color contrast ratio: 4.5:1 for text, 3:1 for UI components
- Support Dynamic Type (iOS) / Font Scaling (Android)
- VoiceOver/TalkBack labels for all interactive elements
- Haptic feedback on task completion (medium impact)

### Critical Assets
1. **App Icon**: Bold geometric "I" letterform with gradient (Now→Soon colors)
2. **6 User Avatars**: Geometric shapes (circle, square, triangle, hexagon, star, diamond) filled with solid lane colors
3. **Empty State Illustrations**: Minimalist line art for each lane when empty (no tasks)
4. **Weekly Reset Celebration**: Confetti particle system (premium, subtle, not childish)

---

**Design Philosophy**: Every interaction should feel instantaneous, intentional, and premium. Bold colors create energy, clean typography ensures clarity, and thoughtful animations provide delight without distraction. This is a tool for action, not contemplation.