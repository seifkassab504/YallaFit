# Yalla Fit 🏋️‍♂️

A mobile-first gym management and personalized workout application built with **Expo**, **React Native**, **TypeScript**, and **Supabase**.

Yalla Fit bridges official body composition assessments (InBody result sheets) with personalized workout plan generation, trainer verification, live workout execution, set/rep logging, and progress analytics.

---

## 🚀 Key Features

- **Role-Based Authentication & Isolation:**
  - Supabase Auth session persistence with React Native AsyncStorage.
  - Member vs. Trainer separation. Self-service signups are strictly defaulted to `member` role; trainer privileges cannot be self-escalated from the client.
- **InBody Extraction & Human Verification:**
  - Image capture (Camera & Photo Gallery) with direct private Supabase Storage upload (`inbody-reports` bucket).
  - OCR document extraction adapter connected to a dedicated Supabase Edge Function (`extract-inbody`).
  - Interactive human verification screen supporting full **5-region segmental lean & fat analysis** (Left Arm, Right Arm, Trunk, Left Leg, Right Leg).
- **Deterministic Workout Generator:**
  - 6 configurable split templates:
    1. **Push / Pull / Legs (PPL)**
    2. **Upper / Lower**
    3. **Full Body**
    4. **Bro Split**
    5. **PPL + Upper / Lower Hybrid**
    6. **Arnold Split**
  - **InBody Verification Gated:** Unverified assessments cannot generate plans.
  - Automatic exercise exclusion based on user-declared limitations and injuries.
- **Trainer Review & Approval Workflow:**
  - Explicit trainer-member assignment model (`trainer_member_assignments`).
  - Trainer portal with pending plans, pending assessments, and assigned members tabs.
  - Inline trainer customization of sets, reps, and rest intervals before approval.
  - Members cannot access or query plans until status is `approved` (enforced via database Row-Level Security).
- **Workout Execution & Progress Logging:**
  - Live session screen with duplicate-free upsert logging for sets, completed reps, and weights.
  - Resumable in-progress sessions.
  - Chronological trend charts for Weight, SMM, and PBF based strictly on verified data.

---

## 🛠️ Project Structure

```text
YallaFit/
├── app/
│   ├── _layout.tsx                    # Protected route gatekeeper & AuthProvider
│   ├── index.tsx                      # Root redirect
│   ├── onboarding.tsx                 # Member fitness parameters onboarding
│   ├── (auth)/
│   │   ├── sign-in.tsx                # Email & password sign-in
│   │   ├── sign-up.tsx                # Registration with member role enforcement
│   │   └── reset-password.tsx         # Password reset instructions
│   ├── (member)/
│   │   ├── dashboard.tsx              # Member home dashboard & quick actions
│   │   ├── inbody/
│   │   │   ├── index.tsx              # Assessment history list & status pills
│   │   │   ├── upload.tsx             # Camera / gallery capture & private storage upload
│   │   │   └── [id].tsx               # 5-region lean & fat verification screen
│   │   ├── workouts/
│   │   │   ├── index.tsx              # Approved workout days and rest schedule
│   │   │   ├── generate.tsx           # 6-split generator request screen
│   │   │   └── session/[dayId].tsx    # Live session & set/rep logger
│   │   └── progress.tsx               # Verified InBody trend charts & session logs
│   └── (trainer)/
│       ├── dashboard.tsx              # Trainer portal (Plans, Assessments, Members)
│       └── plans/[id].tsx             # Trainer inspection, inline edit & approval
├── components/
│   └── ui/                            # Themed Button and Input components
├── constants/
│   └── theme.ts                       # Dark charcoal (#0D0F12) & lime (#CCFF00) design system
├── features/
│   └── auth/AuthContext.tsx           # Supabase auth session & profile provider
├── lib/
│   ├── env.ts                         # Zod environment variable validation
│   ├── supabase.ts                    # Supabase client with AsyncStorage persistence
│   └── validation/authSchemas.ts      # Auth & onboarding validation schemas
├── services/
│   ├── inbody/                        # OCR extraction types & Edge Function adapter
│   └── workout-generator/             # 6 split templates, generator engine & unit tests
├── supabase/
│   ├── migrations/                    # 5 production SQL migrations (schema, RLS, storage, seed, roles)
│   └── functions/extract-inbody/      # Supabase Edge Function for OCR document understanding
└── types/database.ts                  # TypeScript types for Supabase database
```

---

## ⚙️ Setup & Installation Instructions

### 1. Prerequisites
- **Node.js** >= 18 (Tested on Node v24)
- **npm** or **yarn**
- **Expo Go** app on your iOS / Android device or an emulator
- A **Supabase** project (free tier at [supabase.com](https://supabase.com))

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create your local `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Fill in your Supabase project URL and anon/publishable key:
```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

### 4. Apply Database Migrations
In your Supabase project dashboard, navigate to the **SQL Editor** and run the SQL migration files in sequence (or use the Supabase CLI):

1. [`20261018000001_initial_schema.sql`](file:///d:/SK/YallaFit/supabase/migrations/20261018000001_initial_schema.sql): Creates core tables, enums, indexes, and triggers.
2. [`20261018000002_rls_policies.sql`](file:///d:/SK/YallaFit/supabase/migrations/20261018000002_rls_policies.sql): Enables Row Level Security (RLS) across all tables.
3. [`20261018000003_storage_policies.sql`](file:///d:/SK/YallaFit/supabase/migrations/20261018000003_storage_policies.sql): Creates private `inbody-reports` storage bucket and access policies.
4. [`20261018000004_exercise_catalog_seed.sql`](file:///d:/SK/YallaFit/supabase/migrations/20261018000004_exercise_catalog_seed.sql): Seeds starter exercise catalog across muscle groups.
5. [`20261018000005_auth_triggers_and_roles.sql`](file:///d:/SK/YallaFit/supabase/migrations/20261018000005_auth_triggers_and_roles.sql): Configures signup trigger and admin role-management procedures.

### 5. Create First Trainer Account & Assignment
Because users cannot grant themselves trainer privileges from the mobile app, use the secure stored procedures:

1. Sign up a user in the app (e.g. `coach@gym.com`).
2. In Supabase **SQL Editor**, promote them:
   ```sql
   SELECT public.promote_user_to_trainer('USER_UUID_OF_COACH');
   ```
3. Sign up your member user (e.g. `member@gym.com`).
4. Assign the member to the coach:
   ```sql
   SELECT public.assign_member_to_trainer('COACH_UUID', 'MEMBER_UUID', 'Assigned head coach');
   ```

### 6. Edge Function Deployment (OCR Document Extraction)
Deploy the OCR extraction function:
```bash
npx supabase functions deploy extract-inbody
```
Set your OCR provider API key as a secret on Supabase (never in the client app):
```bash
npx supabase secrets set INBODY_OCR_API_KEY=your_key_here
npx supabase secrets set INBODY_OCR_PROVIDER=openai # or mindee / document_ai
```
*(If no OCR key is set, the app cleanly falls back to manual verification mode with all 5-region segmental fields ready for entry).*

---

## 🏃 Running the Application

Start the Expo development server:
```bash
npm start
```

- Press `a` for Android Emulator.
- Press `i` for iOS Simulator.
- Press `w` for Web preview.
- Or scan the QR code with **Expo Go** on a physical device.

---

## 🧪 Automated Testing & Type Checking

- Run unit tests (testing split generation, InBody verification requirement, and injury exclusions):
  ```bash
  npm test
  ```
- Run TypeScript static type checking:
  ```bash
  npm run tsc
  ```

---

## 📋 End-to-End User Journey Verification

1. **Member Onboarding:** Create an account $\rightarrow$ redirected to Onboarding $\rightarrow$ set height, goals, frequency, equipment $\rightarrow$ land on Member Dashboard.
2. **InBody Capture:** Go to InBody $\rightarrow$ Upload $\rightarrow$ take photo or pick image $\rightarrow$ uploaded to private storage $\rightarrow$ extracted values loaded.
3. **5-Region Verification:** Review metrics and all 5 lean/fat regions $\rightarrow$ edit any values $\rightarrow$ click "Submit for Trainer Verification".
4. **Trainer Inspection:** Log in with trainer account $\rightarrow$ view pending assessment on Trainer Dashboard $\rightarrow$ verify the report.
5. **Workout Request:** Member selects verified report, chooses from all 6 splits (e.g. PPL or Arnold Split) $\rightarrow$ plan is generated and submitted as `pending_approval`.
6. **Trainer Approval:** Trainer views the plan, edits sets/reps if desired, and clicks "Approve Workout Plan".
7. **Workout Execution:** Member opens "Approved Workouts" $\rightarrow$ starts Day 1 $\rightarrow$ logs completed reps and weights per set $\rightarrow$ completes workout.
8. **Progress History:** Member opens "Progress & History" $\rightarrow$ views verified InBody trend charts and completed workout logs.
