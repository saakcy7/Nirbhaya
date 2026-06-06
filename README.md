# 🚨 Nirbhaya – Real-Time Emergency SOS Application

[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

Nirbhaya is a dual-layered personal safety and crisis intervention system. It allows users to broadcast instant emergency distress alerts alongside precise live GPS location anchors. The platform features an authenticated workflow utilizing database-managed trusted contacts, paired with a bulletproof **Instant Guest SOS Engine** that operates instantly without requiring an account login.

---

## 📖 Table of Contents
* [Features](#-features)
* [System Architecture](#%EF%B8%8F-system-architecture)
* [Database Schema](#-database-schema)
* [Backend Installation](#-backend-installation)
* [Frontend Installation](#-frontend-installation)
* [API Reference](#-api-reference)

---

## ✨ Features

* **Instant Guest SOS:** Type an emergency email directly on the login screen to send out immediate crisis notifications without waiting to register or log in.
* **Persistent Local Caching:** Local safety coordinates and your guest tracking contact profiles are cached via `AsyncStorage` for rapid subsequent deployment.
* **Smart GPS Race Engine:** Frontend location tracking implements a fast `Promise.race` timeout algorithm that falls back to cached device tracking variables if active network satellite triangulation stalls.
* **Case-Insensitive Array Reconciliation:** Robust backend processing captures raw string inputs, handles formatting cleaning, avoids whitespace typos, and blocks duplicate notifications.

---

## ⚙️ Backend Installation

### 1. Requirements
Ensure you have **Node.js (v18+)** and a **PostgreSQL** instance up and running.

### 2. Set Up Environment Variables
Create a `.env` file inside your server directory root:

```env
PORT=5000
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<db_name>?schema=public"

# Nodemailer SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-system-identity@gmail.com"
SMTP_PASS="your-app-specific-secure-passkey"
MAIL_FROM="🚨 Nirbhaya System Alert <your-system-identity@gmail.com>"

# Install required production packages
npm install

# Run database schema structural migrations
npx prisma migrate dev --name init

# Generate native node database clients
npx prisma generate

# Start your express server development lifecycle
npm run dev

#for frontend
npx expo install expo-location @react-native-async-storage/async-storage

npx expo start

