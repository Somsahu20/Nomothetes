# Frontend Specifications
## Nomothetes - Legal Network Analysis Platform

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18+ with TypeScript |
| Styling | Tailwind CSS |
| Build Tool | Vite |
| State Management | React Query (TanStack Query) |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Form Validation | Zod |
| Graph Visualization | React Flow |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | react-hot-toast or sonner |
| File Upload | react-dropzone |

---

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                 # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Toast.tsx
│   │   ├── layout/             # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── PageContainer.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── cases/              # Case-related components
│   │   │   ├── CaseCard.tsx
│   │   │   ├── CaseTable.tsx
│   │   │   ├── CaseUploader.tsx
│   │   │   └── CaseDetail.tsx
│   │   ├── network/            # Network visualization
│   │   │   ├── NetworkGraph.tsx
│   │   │   ├── NodeDetails.tsx
│   │   │   └── GraphControls.tsx
│   │   ├── entities/           # Entity components
│   │   │   ├── EntityCard.tsx
│   │   │   ├── EntityMerge.tsx
│   │   │   └── EntityList.tsx
│   │   └── charts/             # Chart components
│   │       ├── LineChart.tsx
│   │       ├── PieChart.tsx
│   │       └── BarChart.tsx
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── CasesPage.tsx
│   │   ├── CaseDetailPage.tsx
│   │   ├── UploadPage.tsx
│   │   ├── NetworkPage.tsx
│   │   ├── EntitiesPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── SearchPage.tsx
│   │   └── TasksPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useCases.ts
│   │   ├── useEntities.ts
│   │   ├── useNetwork.ts
│   │   └── useAnalytics.ts
│   ├── services/
│   │   ├── api.ts              # Axios instance
│   │   ├── auth.ts             # Auth API calls
│   │   ├── cases.ts            # Cases API calls
│   │   ├── entities.ts
│   │   ├── network.ts
│   │   └── analytics.ts
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   ├── types/
│   │   ├── auth.ts
│   │   ├── case.ts
│   │   ├── entity.ts
│   │   ├── network.ts
│   │   └── api.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Pages Specification

### 1. Login Page (`/login`)

**Components:**
- Centered card layout
- Email input field
- Password input field with show/hide toggle
- "Remember Me" checkbox
- Login button
- Link to registration page
- Error message display

**Validation:**
- Email format
- Password required

**Actions:**
- Submit → Call login API → Store token → Redirect to dashboard

---

### 2. Register Page (`/register`)

**Components:**
- Centered card layout
- Full Name input
- Email input
- Password input with strength indicator
- Confirm Password input
- Organization input (optional)
- Register button
- Link to login page

**Validation:**
- Email format
- Password: min 8 chars, uppercase, lowercase, number, special char
- Passwords match

---

### 3. Dashboard Page (`/dashboard`)

**Components:**
- Statistics cards:
  - Total Cases
  - Total Entities
  - Network Connections
  - Processing Queue
- "Showing data from your X cases" header
- Recent activity feed (last 10 uploads)
- Quick action buttons:
  - Upload New Case
  - View Network
  - Run Analysis
- Charts:
  - Cases over time (line chart)
  - Entity type distribution (pie chart)
  - Top 10 judges by case count (bar chart)

---

### 4. Cases List Page (`/cases`)

**Components:**
- Data table with columns:
  - Case ID (truncated UUID)
  - Filename
  - Court
  - Upload Date
  - Status (badge)
  - Actions (View/Delete)
- Pagination controls
- Filter sidebar:
  - Court dropdown
  - Date range picker
  - Status filter
  - Document type filter
- Search bar
- Sort dropdown
- Bulk selection checkboxes

---

### 5. Case Detail Page (`/cases/:id`)

**Components:**
- Header with case metadata
- Tab navigation:
  - **Overview:** Summary, court, date, document type
  - **Entities:** Table of extracted entities with type badges
  - **Full Text:** Scrollable text viewer
  - **AI Analysis:** Formatted analysis results
  - **Network:** Mini network graph
- Action buttons:
  - Re-run Analysis
  - Download PDF
  - Delete
- Related cases sidebar

---

### 6. Upload Page (`/upload`)

**Components:**
- Drag-and-drop file upload zone
- File preview list with:
  - Filename
  - File size
  - Upload progress bar
  - Remove button
- Metadata inputs:
  - Court name (autocomplete)
  - Case date (date picker)
  - Document type (dropdown)
- Upload button
- Status indicators

---

### 7. Network Graph Page (`/network`)

**Components:**
- React Flow canvas
- Controls panel:
  - Zoom in/out buttons
  - Fit to screen
  - Layout selector (force-directed/hierarchical/circular)
  - Entity type filter
  - Node search
- Node tooltip on hover
- Node details panel on click:
  - Entity info
  - Connected cases list
  - Centrality metrics
- Export button (JSON/GraphML)
- Warning banner for large networks (>500 nodes)

**Node Styling:**
- Judges: Blue (#3B82F6)
- Lawyers: Green (#10B981)
- Courts: Orange (#F59E0B)
- Size: Based on centrality score

---

### 8. Entities Page (`/entities`)

**Components:**
- Entity directory with search
- Type filter tabs (All/Judges/Lawyers/Courts)
- Entity cards showing:
  - Name
  - Type badge
  - Case count
  - Top collaborators
  - Centrality score
- Expandable details:
  - Full case list
  - Network subgraph
  - Timeline
- Merge interface:
  - Side-by-side comparison
  - Similarity score
  - Confirm/Reject buttons

---

### 9. Analytics Page (`/analytics`)

**Components:**
- Network Metrics Dashboard:
  - Top 10 judges table
  - Top 10 lawyers table
  - Court distribution chart
- Trends Section:
  - Cases per month (line chart)
  - Entity growth (area chart)
- Judge Behavior Analysis:
  - Sentiment gauge chart
  - Average case duration
  - Common arguments
- Export PDF button

---

### 10. Search Page (`/search`)

**Components:**
- Search input with autocomplete
- Advanced search modal:
  - Query builder
  - Boolean operators
  - Date range
  - Entity filters
- Results list:
  - Case card with highlighted snippets
  - Relevance score
  - Quick actions
- Faceted filters sidebar
- Pagination
- Results count header

---

### 11. Tasks Page (`/tasks`)

**Components:**
- Task list table:
  - Task ID
  - Type (OCR/Entity/Analysis)
  - Status badge
  - Progress bar
  - Created time
  - Actions (Retry for failed)
- Auto-refresh every 5 seconds
- Filter by status/type
- Batch retry button

---

## Design System

### Colors (Tailwind)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3B82F6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      }
    }
  }
}
```

### Typography

- Headings: Inter (system font stack)
- Body: Inter
- Monospace: JetBrains Mono (code blocks)

### Component Patterns

**Button Variants:**
```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
```

**Status Badges:**
```tsx
<Badge status="processing">Processing</Badge>  // Yellow
<Badge status="complete">Complete</Badge>      // Green
<Badge status="failed">Failed</Badge>          // Red
```

---

## TypeScript Types

### Core Types

```typescript
// types/auth.ts
interface User {
  user_id: string;
  email: string;
  full_name: string;
  organization?: string;
  created_at: string;
  last_login?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// types/case.ts
interface Case {
  case_id: string;
  filename: string;
  court_name?: string;
  case_date?: string;
  document_type?: string;
  upload_date: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  entity_count: number;
  has_analysis: boolean;
}

// types/entity.ts
interface Entity {
  entity_id: string;
  entity_name: string;
  entity_type: 'PERSON' | 'ORG' | 'DATE';
  case_count: number;
  centrality_score?: number;
  aliases?: string[];
}

// types/network.ts
interface GraphNode {
  id: string;
  label: string;
  type: string;
  size: number;
  color: string;
  position?: { x: number; y: number };
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

interface NetworkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total_nodes: number;
  total_edges: number;
  truncated: boolean;
}
```

---

## State Management

### React Query Setup

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const newToken = await refreshToken();
      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api.request(error.config);
      }
    }
    return Promise.reject(error);
  }
);
```

### Query Hooks

```typescript
// hooks/useCases.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useCases(filters: CaseFilters) {
  return useQuery({
    queryKey: ['cases', filters],
    queryFn: () => fetchCases(filters),
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}
```

---

## Accessibility Requirements

- ARIA labels on all interactive elements
- Keyboard navigation support
- Focus indicators visible
- Color contrast ratio ≥ 4.5:1
- Screen reader support
- Skip navigation links
- Form error announcements

---

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Lighthouse Score | > 90 |
| Bundle Size (gzipped) | < 200KB |

### Optimization Strategies

1. **Code splitting** - Lazy load routes
2. **Image optimization** - WebP format, lazy loading
3. **Virtual scrolling** - For large lists
4. **Memoization** - React.memo for expensive components
5. **Debouncing** - Search inputs, resize handlers
