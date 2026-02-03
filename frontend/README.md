# Nomothetes Frontend

React + TypeScript + Vite frontend for the Nomothetes Legal Network Analysis Platform.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Router v6** for routing
- **TanStack Query** for server state management
- **Axios** for HTTP requests
- **Zod** for validation
- **Lucide React** for icons
- **react-hot-toast** for notifications

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build

```bash
npm run build
```

### Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:8000
```

## Project Structure

```
src/
├── components/
│   ├── ui/           # Base UI components
│   ├── layout/       # Layout components
│   └── auth/         # Auth-related components
├── pages/
│   └── auth/         # Auth pages
├── context/          # React contexts
├── services/         # API services
├── types/            # TypeScript types
└── App.tsx           # Main app component
```

## Features

- User authentication (login/register)
- Protected routes
- JWT token management with auto-refresh
- Password strength indicator
- Toast notifications
- Responsive design
