# CRM Form & Integration Implementation Guide

## What's Been Implemented

### ✅ Shared Form Components
All forms are now reusable components that can be accessed from any route:

1. **CreateLeadForm** (`scr/components/forms/CreateLeadForm.tsx`)
   - Fields: Contact Name, Telephone, Email, Position, Company Name, Company Email, Rating (Cold/Warm/Hot), Status (New/Contacted/Unqualified/Qualified)
   - Posts to `/api/leads`
   - Automatically updates dashboard

2. **CreateClientForm** (`scr/components/forms/CreateClientForm.tsx`)
   - Fields: Company Name, Company Email, Address, Contact Name, Telephone, Email, Position, Sector (IT/Agric/Finance/Healthcare/Other)
   - Posts to `/api/clients`

3. **CreateSaleForm** (`scr/components/forms/CreateSaleForm.tsx`)
   - Fields: Deal Name, Sale Amount, Stage (Contacted/Proposal/Negotiations/Closed/Lost), Type (Existing/New)
   - Posts to `/api/deals`
   - Auto-calculates probability based on stage

4. **CreateContactForm** (`scr/components/forms/CreateContactForm.tsx`)
   - Fields: Name, Organization, Telephone, Email, Position, Birthday, Reporting Line
   - Posts to `/api/contacts`

5. **CreateTaskForm** (`scr/components/forms/CreateTaskForm.tsx`)
   - Fields: Company, Contact, Subject (Call/Support/etc), Assigned To, Description, Due Date, Status, Priority
   - Posts to `/api/tasks`

### ✅ Form Context System
- **useFormDialog** hook provides global form state management
- **FormProvider** wraps AppShell to enable forms from any route
- **FormModals** component renders all 5 form dialogs centrally

### ✅ TopBar Integration
The "Add New" button in the topbar now:
- Detects current route
- Opens appropriate form based on route:
  - `/leads` → Opens Lead form
  - `/deals` → Opens Sale form
  - `/clients` → Opens Client form
  - `/contacts` → Opens Contact form
  - `/tasks` → Opens Task form

### ✅ Backend Endpoints
- **POST `/api/leads`** - Create lead with rating→score mapping
- **POST `/api/clients`** - Create client with nested contact info
- **POST `/api/contacts`** - Create standalone contact
- **POST `/api/deals`** - Create deal/sale with auto stage→probability
- **POST `/api/tasks`** - Create task with priority levels
- **POST `/api/email/send`** - Queue email (currently demo/logs to console)
- **POST `/api/whatsapp/open`** - Generate WhatsApp deep link

### ✅ WhatsApp Integration
- **WHATSAPP_CONTACT = "0770821677"** (configured in communications.ts)
- Dashboard button opens WhatsApp with this contact
- Uses deep link: `https://wa.me/0770821677?text=<message>`
- Works on both mobile (wa.me) and web (web.whatsapp.com)

### ✅ Email System
- Frontend utility: `sendEmail(to, subject, body)` 
- Backend logs emails and stores in MongoDB
- Configured with: florencenamukisa08@gmail.com (as sender)
- Can be extended with SMTP/SendGrid integration

### ✅ Calendar Route
- Already implemented at `/calendar`
- Shows meetings, calls, and reminders
- KPIs: Events, Confirmed, Upcoming, Cancelled
- Displays calendar events in Kanban view

## How to Use

### From Sidebar "Add New" Button
1. Navigate to any sales section (Leads, Deals, Clients, Contacts, Tasks)
2. Click "Add New" button in topbar
3. Form for that section opens automatically

### From Dashboard Quick Actions
1. Go to Dashboard (/)
2. Quick action buttons open forms:
   - "Add Lead" → Lead form
   - "Add Deal" → Sale form
   - "Create Client" → Client form
   - "Add Task" → Task form
   - "Send WhatsApp" → Opens WhatsApp with 0770821677

### Manual Form Opening (Dev)
```typescript
import { useFormDialog } from '@/hooks/useFormDialog';

function MyComponent() {
  const { setOpenForm } = useFormDialog();
  
  return (
    <>
      <button onClick={() => setOpenForm('lead')}>Create Lead</button>
      <button onClick={() => setOpenForm('client')}>Create Client</button>
      <button onClick={() => setOpenForm('sale')}>Create Sale</button>
      <button onClick={() => setOpenForm('contact')}>Create Contact</button>
      <button onClick={() => setOpenForm('task')}>Create Task</button>
    </>
  );
}
```

## Database Operations

All form submissions:
1. Insert record into respective collection (leads, clients, deals, etc)
2. Automatically update dashboardData arrays for real-time UI refresh
3. Trigger React Query invalidation for dashboard refetch

**Auto-Calculations:**
- Leads: Rating (Cold/Warm/Hot) → Score (30/60/90)
- Deals: Stage → Probability (Contacted=20%, Proposal=50%, Negotiations=70%, Closed=100%, Lost=0%)

## Configuration

### WhatsApp Number
Edit in `scr/lib/communications.ts`:
```typescript
export const WHATSAPP_CONTACT = "0770821677";
```

### Email Sender
Backend configured with: `florencenamukisa08@gmail.com`
Edit in `backend/server.js` POST `/api/email/send` handler

### Portal URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- Email route: /email
- WhatsApp route: /whatsapp
- Calendar route: /calendar

## Testing Checklist

- [ ] Click "Add New" on each sales route (leads, deals, clients, contacts, tasks)
- [ ] Verify correct form opens for each route
- [ ] Fill and submit a form
- [ ] Verify data persists to MongoDB
- [ ] Check dashboard updates in real-time
- [ ] Test WhatsApp button opens chat with 0770821677
- [ ] Test email functionality from dashboard
- [ ] Verify calendar displays meetings and events
- [ ] Check all TypeScript compilation passes

## File Structure

```
scr/
├── components/
│   ├── forms/
│   │   ├── CreateLeadForm.tsx
│   │   ├── CreateClientForm.tsx
│   │   ├── CreateSaleForm.tsx
│   │   ├── CreateContactForm.tsx
│   │   ├── CreateTaskForm.tsx
│   │   └── FormModals.tsx (central dialog renderer)
│   └── layout/
│       └── AppShell.tsx (wrapped with FormProvider)
├── hooks/
│   └── useFormDialog.tsx (context + provider)
├── lib/
│   └── communications.ts (WhatsApp & email utilities)
└── routes/
    ├── calendar.tsx
    ├── email.tsx
    └── whatsapp.tsx

backend/
├── server.js (new email & WhatsApp endpoints)
└── seed.js
```

## Notes

- All forms are synchronized - same form used across all routes
- Form context prevents prop-drilling
- WhatsApp deep links work on all devices
- Email currently logs to console for demo (extend with SMTP for production)
- Database operations maintain tenant isolation via tenantId
- All form submissions invalidate dashboard query for UI consistency
