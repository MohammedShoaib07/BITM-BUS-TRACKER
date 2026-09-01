# Vertical Bus Tracking Plan

## Goal
Transform the bus tracking UI to work like "Where Is My Train" app with a clean vertical timeline, remove neo-brutalism styling, and ensure the bus marker moves vertically along the timeline based on actual GPS position. Stops should only be marked "reached" when the bus physically reaches the stop location.

## Current State Analysis

### What exists now:
- `LiveMap.tsx` has BOTH a horizontal route strip (lines 65-111) AND a vertical timeline (lines 113-146)
- Bus emoji (🚌) moves horizontally using `left: calc(${progressPercent}% - 12px)`
- Neo-brutalism styling in `index.css` (hard shadows, thick borders, no border-radius)
- Tracking engine already calculates `distanceToNextStopMeters`, `progressPercent`, `nextStopId`, `previousStopId`
- Simulation engine interpolates GPS between stops using lat/lng
- Only route-01 has real GPS coordinates; other routes have named stops only

### What needs to change:
1. Remove horizontal route strip entirely
2. Remove neo-brutalism styling (clean, modern UI)
3. Move bus marker vertically along the timeline between stops
4. Bus position reflects actual GPS progress between previous/next stop
5. Stops marked "reached" only when bus is within 30m (already handled by tracking engine)

## Implementation Steps

### Step 1: Remove Neo-Brutalism Styling (`client/src/index.css`)

Remove or neutralize the following:
- `.glass-panel` class (lines 43-49) - remove hard border/shadow
- `[class*="rounded-"]` override (lines 56-58) - remove `border-radius: 0`
- Brutalist `button` styles (lines 60-74) - remove hard shadows/borders
- Brutalist `input, select` styles (lines 76-87) - remove hard shadows
- `.leaflet-container` brutalist styles (lines 93-98)

Replace with clean, modern styling:
- Soft shadows, rounded corners, subtle borders
- Smooth transitions
- Modern color palette (keep brand blue)

### Step 2: Rewrite LiveMap Component (`client/src/components/LiveMap.tsx`)

#### 2a. Remove Horizontal Strip Section
Delete lines 65-111 (the entire horizontal route strip with `overflow-x-auto`)

#### 2b. Enhance Vertical Timeline with Moving Bus Marker

The vertical timeline should show:
- A vertical line connecting all stops
- Stop circles with names and sequence numbers
- A bus emoji (🚌) that moves along the vertical line between `previousStopId` and `nextStopId`
- Bus position calculated from `distanceToNextStopMeters` and segment length

**Bus marker vertical positioning logic:**
```
// Find the segment the bus is currently on
const prevIdx = orderedStops.findIndex(s => s.id === snapshot.previousStopId);
const nextIdx = orderedStops.findIndex(s => s.id === snapshot.nextStopId);

// Calculate how far along the segment the bus is (0 = at prev stop, 1 = at next stop)
// We need segment length - can calculate from stops lat/lng or use distanceToNextStopMeters
const segmentLength = /* distance between prev and next stop */;
const progressAlongSegment = 1 - (snapshot.distanceToNextStopMeters / segmentLength);

// Position bus marker between the two stops
// Each stop li has a fixed height, so calculate pixel position
```

**Important consideration:** Only route-01 has lat/lng data. For routes without coordinates:
- The simulation engine won't work (needs lat/lng for interpolation)
- The tracking engine won't calculate proper distances
- The vertical timeline should still render stops, but bus movement won't work until coordinates are added

**For route-01 (and any route with coordinates):**
- Calculate segment length using haversine between previous and next stop
- Position bus marker proportionally between stops based on `distanceToNextStopMeters`
- Use CSS `top` position with `transition-all duration-1000 ease-linear` for smooth movement

#### 2c. Stop State Logic (already correct, keep as-is)

The existing `getStopState` function correctly determines:
- `reached`: `stop.sequence < nextSequence` (bus has passed this stop)
- `current`: `stop.id === snapshot.nextStopId` AND `distanceToNextStopMeters <= 30`
- `approaching`: `stop.id === snapshot.nextStopId` AND `distanceToNextStopMeters > 30`
- `upcoming`: everything else

This logic already ensures stops are only marked "reached" when the bus has actually progressed past them.

#### 2d. Visual Design for Vertical Timeline

```
┌─────────────────────────────────────────┐
│  🚌 Bus 1 · Route 01                    │
│  Next stop: Patel Nagar · ETA 2 min     │
├─────────────────────────────────────────┤
│                                         │
│  ● M.G. Point                   Reached │
│  │                                      │
│  ● S.N. PET SBI BANK             Reached│
│  │                                      │
│  🚌 Patel Nagar               Approaching│  ← Bus marker here
│  │                                      │
│  ○ Punjab National Bank          Await  │
│  │                                      │
│  ○ Raghavendra Swamy Temple      Await  │
│  │                                      │
│  ○ ...                                  │
│                                         │
└─────────────────────────────────────────┘
```

### Step 3: Update BusTracker Page (`client/src/pages/student/BusTracker.tsx`)

- Remove any brutalist class references (`.glass-panel`)
- Update to use clean card styling
- Ensure the layout works with the new vertical timeline

### Step 4: Update Other Components Using `.glass-panel`

Search and update:
- `client/src/components/ui.tsx` - Badge, Card, StatPill components
- `client/src/pages/Login.tsx`
- `client/src/pages/driver/Dashboard.tsx`
- `client/src/pages/admin/Dashboard.tsx`

Replace `.glass-panel` with clean card styling (soft shadow, rounded corners, subtle border).

## Key Technical Details

### Bus Marker Position Calculation

The `TrackingSnapshot` provides:
- `previousStopId`: The last stop the bus passed
- `nextStopId`: The next stop the bus is heading to
- `distanceToNextStopMeters`: Distance from bus to next stop

To position the bus vertically:
1. Find the index of previousStop and nextStop in orderedStops
2. Calculate segment length (haversine distance between stops)
3. `progressAlongSegment = 1 - (distanceToNextStopMeters / segmentLength)`
4. Position bus marker at the corresponding pixel position between the two stop elements

### Segment Length Calculation

Since we have lat/lng for stops, we can calculate segment length on the client:
```typescript
// Simple haversine or use the stops' lat/lng directly
const segmentLength = calculateDistance(
  prevStop.latitude, prevStop.longitude,
  nextStop.latitude, nextStop.longitude
);
```

For routes without coordinates, the bus marker won't show (no valid position data).

### Smooth Animation

Use CSS transitions for smooth bus movement:
```css
transition: top 1s linear;
```

This matches the existing 1000ms transition pattern.

## Files to Modify

1. `client/src/index.css` - Remove neo-brutalism, add clean modern styling
2. `client/src/components/LiveMap.tsx` - Remove horizontal strip, add vertical bus marker
3. `client/src/pages/student/BusTracker.tsx` - Update styling classes
4. `client/src/components/ui.tsx` - Update component styling
5. `client/src/pages/Login.tsx` - Update styling
6. `client/src/pages/driver/Dashboard.tsx` - Update styling
7. `client/src/pages/admin/Dashboard.tsx` - Update styling

## Validation Plan

1. Start the server and client
2. Login as driver (driver1@bitm.edu / driver123)
3. Start a simulation trip for bus-01 (route-01)
4. Navigate to student view and select bus-01
5. Verify:
   - No horizontal route strip visible
   - Vertical timeline shows all stops
   - Bus emoji moves vertically along the timeline
   - Bus position matches actual GPS progress
   - Stops turn "Reached" only when bus arrives at them
   - Clean modern UI (no hard shadows, rounded corners)
6. Test with other routes (should show stops but no bus movement until coordinates added)

## Out of Scope

- Adding GPS coordinates for other routes (user will add later)
- Changing the tracking engine algorithm (already works correctly)
- Changing the simulation engine (already works correctly)
- Mobile responsiveness improvements (can be done later)
