# BITM SmartBus

A Where-Is-My-Train-style live college bus tracking platform for Ballari Institute of Technology and Management, with role-based Student / Driver / Admin dashboards, digital QR bus passes, and a real fee/pass/route boarding-authorization engine.

**Nothing in this app is mocked or hardcoded on the frontend.** Every screen reads from a real Node/Express backend backed by real CSV files on disk, pushed live to the browser over Socket.IO. Maps are rendered with **Leaflet** + OpenStreetMap tiles. GPS simulation (required for a hackathon demo where no physical bus is available) runs through the exact same backend ingestion → route-matching → ETA → broadcast pipeline that real driver GPS uses — the simulator just stands in for the hardware GPS chip, nothing downstream is faked.

## What's real vs. simulated

| Real | Simulated (by design, per hackathon constraints) |
|---|---|
| Auth (JWT + bcrypt), CSV database, route matching, Haversine distance, ETA calc, fee/pass/bus/route authorization engine, boarding records, unauthorized-attempt alerts, all three dashboards, Socket.IO live push | The physical bus's GPS chip (browser Geolocation API works too if you test outdoors) and multi-bus fleet scale |

## Project structure

```
bitm-smartbus/
├── server/     Node.js + Express + TypeScript + Socket.IO backend
├── client/     React + Vite + TypeScript + Tailwind + Leaflet frontend
└── data/       CSV files — the actual persistent database
```

## Requirements

- Node.js 18+
- npm

## 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

## 2. Seed demo data

This writes real rows into `/data/*.csv` (routes, stops with real Ballari-area coordinates, buses, users, passes, fees).

```bash
cd server
npm run seed
```

Demo accounts (all seeded, all real bcrypt-hashed passwords):

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | admin@bitm.edu | admin123 | |
| Driver | driver1@bitm.edu | driver123 | Bus KA-34-F-1234, Route 05 |
| Driver | driver2@bitm.edu | driver123 | Bus KA-34-F-5678, Route 12 |
| Student | shoaib@bitm.edu | student123 | Fee PAID, pass valid → boards successfully |
| Student | priya@bitm.edu | student123 | Fee PAID, pass valid |
| Student | arjun@bitm.edu | student123 | Fee PENDING → boarding will be DENIED (use this to demo the authorization engine) |

## 3. Run the backend

```bash
cd server
cp .env.example .env
npm run dev
```

Server starts at `http://localhost:4000`. Health check: `GET /api/health`.

## 4. Run the frontend

In a second terminal:

```bash
cd client
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Demo flow

1. **Log in as `driver1@bitm.edu`.** Choose "GPS Simulation" and click **Start Trip**. The simulator generates real lat/lng fixes along Route 05 (Hospet → Vidyanagar → Cantonment → VIMS → BITM) and pushes them through the real tracking pipeline every 1.5s.
   - To use **real GPS** instead, select "Real GPS (browser Geolocation)" — the driver's own device location will be streamed live via `navigator.geolocation.watchPosition()`.
2. **Log in as `shoaib@bitm.edu`** (in another browser/incognito tab). Watch the bus move live on the Leaflet map, with next-stop / distance / ETA updating in real time via Socket.IO.
3. On the driver dashboard, use **Scan Student Pass** (camera QR scan or manual entry) with pass number `PASS-0001` (Shoaib) → **🟢 BOARDING AUTHORIZED**.
4. Try pass `PASS-0003` (Arjun, fee PENDING) → **🔴 BOARDING DENIED — Transportation fee is not active.**
5. **Log in as `admin@bitm.edu`.** Watch the same boarding event and the unauthorized-attempt alert land live on the Admin dashboard. Toggle Arjun's fee to PAID from the Students tab, then re-scan his pass on the driver dashboard — it now authorizes.

## Architecture notes

- **CSV data layer** (`server/src/data/csvRepository.ts`) is a generic repository with `readAll/insert/update/upsert/delete`, isolated behind an interface so PostgreSQL can be swapped in later without touching business logic, per the original spec.
- **Route matching / ETA engine** (`server/src/services/trackingEngine.ts`) projects each GPS fix onto the nearest route segment using Haversine distance, determines previous/next stop, progress %, distance, and ETA to every remaining stop.
- **Authorization engine** (`server/src/services/authorizationEngine.ts`) checks pass validity → fee status → assigned bus → assigned route, in that order, and writes every decision to `boarding_records.csv` (and `unauthorized_attempts.csv` on denial).
- **Simulation engine** (`server/src/services/simulationEngine.ts`) calls the identical `ingestLocation()` function that the real GPS endpoint calls — see `server/src/routes/trackingRoutes.ts`.
- **Maps**: `react-leaflet` + OpenStreetMap tiles (no API key required), with a rotating bus marker, stop markers, and route polyline, in `client/src/components/LiveMap.tsx`.

## Extending

- Add more buses/routes/students by inserting into the relevant CSV or extending `server/src/data/seed.ts`.
- Swap CSV for PostgreSQL by re-implementing `CsvRepository`'s methods against Prisma — controllers/services never touch the file system directly.
