# 🚨 Nirbhaya — Real-Time Emergency SOS Application

[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

> **Nirbhaya** (meaning *fearless*) is a dual-layered personal safety and crisis intervention system that enables users to broadcast instant emergency distress alerts alongside precise live GPS location data to trusted contacts — even without an account.

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#-environment-variables)
- [Contributing](#-contributing)

---

## 🛡️ About the Project

Nirbhaya is designed with one core goal: **get help fast, always** — whether the user is logged in or not.

It provides two parallel safety layers:

1. **Authenticated Mode** — Registered users can manage a database-backed list of trusted emergency contacts and send GPS-anchored SOS alerts at any time.
2. **Instant Guest SOS Engine** — Anyone, without an account, can type an email directly on the login screen and immediately trigger an emergency alert. No registration. No waiting.

Beyond emergency broadcasting, Nirbhaya functions as a holistic personal safety companion with tools for real-time situational awareness, discreet escape mechanisms, and community-driven incident intelligence.

---

## ✨ Key Features

### 🆘 Emergency Response
- **Instant Guest SOS** — Send an emergency alert from the login screen by entering just an email address. No account required.
- **Live GPS Location Sharing** — Broadcasts the user's precise coordinates with every alert so contacts can locate them immediately.
- **Smart GPS Race Engine** — Uses a `Promise.race` timeout algorithm on the frontend: if live GPS triangulation stalls, it seamlessly falls back to cached device location variables, ensuring alerts are never blocked by connectivity issues.
- **Persistent Local Caching** — Guest tracking contact profiles and last-known safety coordinates are cached via `AsyncStorage` for rapid re-deployment in subsequent sessions.
- **Trusted Contacts Management** — Authenticated users can add, view, and remove database-managed emergency contacts.
- **Case-Insensitive Deduplication** — Backend robustly handles raw string inputs, strips whitespace, normalizes casing, and blocks duplicate email notifications to the same contact.
- **Nodemailer SMTP Integration** — Alerts are delivered via email using a configurable SMTP setup (Gmail-compatible out of the box).

### 📞 Fake Call Escape
- **Simulated Incoming Call** — Trigger a convincing fake phone call UI to discreetly exit an uncomfortable or dangerous situation without drawing suspicion.
- **Customizable Caller Identity** — Set a fake caller name and optionally schedule the call to ring after a delay.
- **Realistic Audio & Vibration** — Mimics native call behavior including ringtone, haptic feedback, and a timed "conversation" to sell the illusion.

### 📍 Incident Reporting
- **Community Hazard Reporting** — Users can file geo-tagged reports for unsafe areas, incidents, or ongoing threats directly from the app.
- **Categorized Report Types** — Supports structured tagging (e.g., harassment, theft, unsafe lighting, suspicious activity) for organized community intelligence.
- **Timestamped & Verified** — Each report carries a precise timestamp and the submitting user's location for accuracy.
- **Anonymous Submission Option** — Authenticated users may choose to submit reports without exposing their identity to the broader community.

### 🗺️ Safety Map & Safer Routes
- **Live Incident Heatmap** — An interactive map visualizes community-reported incidents as a density overlay, giving users an at-a-glance read on area safety.
- **Incident Markers** — Individual case pins on the map provide drill-down details: category, description, date, and proximity.
- **Safer Route Suggestion** — When navigating from A to B, the app calculates and highlights routes that minimize exposure to high-incident zones, powered by the incident dataset.
- **Real-Time Map Updates** — The map refreshes as new community reports come in, keeping the safety picture current.



## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Mobile Frontend | React Native (Expo), TypeScript |
| Navigation | Expo Router / React Navigation |
| State Management | React Context API + `AsyncStorage` |
| Maps & Routing | `react-native-maps`, Google Maps SDK |
| Location Services | `expo-location` |
| Backend | Node.js, Express.js, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Email Service | Nodemailer (SMTP / Gmail) |
| Authentication | JWT (JSON Web Tokens) |
| API Communication | REST (Axios / Fetch) |



## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL database
- Expo CLI (`npm install -g expo-cli`)
- A Gmail account (or other SMTP provider) for alert emails
- Google Maps API key (for the safety map)

### Backend Setup

**1. Navigate to the server directory and install dependencies:**

```bash
cd server
npm install
```

**2. Copy the environment template and fill in your values:**

```bash
cp .env.example .env
```

**3. Run Prisma migrations to set up the database schema:**

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**4. Start the backend server:**

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

---

### Frontend Setup

**1. Navigate to the project root and install dependencies:**

```bash
npm install
```

**2. Copy the environment template and add your API URL and Google Maps key:**

```bash
cp .env.example .env
```

**3. Start the Expo development server:**

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your device, or press `i` for the iOS simulator / `a` for Android emulator.

---



## 🔐 Environment Variables

**Server (`server/.env`):**

```env
DATABASE_URL="postgresql://user:password@localhost:5432/nirbhaya"
JWT_SECRET="your-jwt-secret"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Nirbhaya Alert <your-email@gmail.com>"
PORT=3000
```

> ⚠️ Never commit `.env` files. The `.env.example` templates are safe to commit as placeholders.

---

## 🤝 Contributing

Contributions are welcome and appreciated. To contribute:

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes with a clear message: `git commit -m 'feat: add your feature'`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request against `main`.

Please follow existing code style conventions and include relevant tests where applicable.

<div align="center">
  <sub>Built with purpose. Stay fearless. 🛡️</sub>
</div>


<img width="1080" height="2340" alt="Screenshot_20260608_002636_Expo Go" src="https://github.com/user-attachments/assets/ac52554b-ff85-487e-8d6c-811a5567219e" />


