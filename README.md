# Muzlix WatchMovie

Muzlix WatchMovie is a desktop movie streaming application with a high-fidelity Netflix-style UI. 
Built using React, TypeScript, Vite, and Electron, it offers an immersive, responsive interface for browsing and streaming movies.

## Features

- **High-Fidelity Interface**: Netflix-style immersive, responsive UI with a clean, professional film detail layout.
- **Robust Search Functionality**: Advanced search system that queries film data.
- **Dynamic Genre Filtering**: Genre data fetched dynamically from the backend to easily filter movies.
- **Page-Based Navigation**: Intuitive navigation system for a smooth browsing experience.
- **Cloudflare Bypass**: Utilizes an Electron-based hidden window to bypass Cloudflare protection for secure and uninterrupted search queries.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Desktop Environment**: Electron
- **Backend/API**: Custom API (Node.js/Express)

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server (runs the API, Vite, and Electron app concurrently):
   ```bash
   npm run dev
   ```

## Building for Production

To build the application for production:
```bash
npm run build
```

## Disclaimer
This project is for educational purposes.
