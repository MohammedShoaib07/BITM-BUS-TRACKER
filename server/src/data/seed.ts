import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import {
  usersRepo, studentsRepo, driversRepo, busesRepo, routesRepo, stopsRepo,
  passesRepo, feesRepo, tripsRepo, locationsRepo, boardingRepo, unauthorizedRepo, notificationsRepo
} from "./repositories";

function hash(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

function clear(repo: { readAll: () => any[]; delete: (id: string) => boolean }) {
  repo.readAll().forEach((r: any) => repo.delete(r.id));
}

function seed() {
  [usersRepo, studentsRepo, driversRepo, busesRepo, routesRepo, stopsRepo, passesRepo, feesRepo, tripsRepo, locationsRepo, boardingRepo, unauthorizedRepo, notificationsRepo]
    .forEach(clear);

  // Route 05: Hospet -> Vidyanagar -> Cantonment -> VIMS -> BITM
  // Real approximate coordinates around Ballari / Hospet, Karnataka.
  const routeId = "route-05";
  routesRepo.insert({ id: routeId, name: "Route 05", description: "Hospet - Vidyanagar - Cantonment - VIMS - BITM" });

  const stopDefs = [
    { name: "Hospet", latitude: 15.2688, longitude: 76.3927, sequence: 1 },
    { name: "Vidyanagar", latitude: 15.1698, longitude: 76.6906, sequence: 2 },
    { name: "Cantonment", latitude: 15.1394, longitude: 76.9214, sequence: 3 },
    { name: "VIMS", latitude: 15.1451, longitude: 76.9231, sequence: 4 },
    { name: "BITM", latitude: 15.1523, longitude: 76.9280, sequence: 5 }
  ];
  const stops = stopDefs.map((s) => ({ id: uuid(), routeId, ...s }));
  stops.forEach((s) => stopsRepo.insert(s));

  const busId = "bus-05";
  busesRepo.insert({ id: busId, registrationNumber: "KA-34-F-1234", routeId, capacity: 45, status: "active" });

  // Second bus/route for realism (fewer demo details, still fully functional)
  const routeId2 = "route-12";
  routesRepo.insert({ id: routeId2, name: "Route 12", description: "Gandhinagar - Bellary Bypass - Cowl Bazaar - BITM" });
  const stopDefs2 = [
    { name: "Gandhinagar", latitude: 15.1389, longitude: 76.9203, sequence: 1 },
    { name: "Bellary Bypass", latitude: 15.1420, longitude: 76.9245, sequence: 2 },
    { name: "Cowl Bazaar", latitude: 15.1465, longitude: 76.9260, sequence: 3 },
    { name: "BITM", latitude: 15.1523, longitude: 76.9280, sequence: 4 }
  ];
  const stops2 = stopDefs2.map((s) => ({ id: uuid(), routeId: routeId2, ...s }));
  stops2.forEach((s) => stopsRepo.insert(s));
  const busId2 = "bus-12";
  busesRepo.insert({ id: busId2, registrationNumber: "KA-34-F-5678", routeId: routeId2, capacity: 40, status: "active" });

  // Users: 1 admin, 2 drivers, 3 students
  const adminUser = { id: uuid(), email: "admin@bitm.edu", passwordHash: hash("admin123"), role: "admin" as const, name: "Transport Officer", phone: "9900000000" };
  usersRepo.insert(adminUser);

  const driverUser = { id: uuid(), email: "driver1@bitm.edu", passwordHash: hash("driver123"), role: "driver" as const, name: "Ramesh Kumar", phone: "9900000001" };
  usersRepo.insert(driverUser);
  const driverId = uuid();
  driversRepo.insert({ id: driverId, userId: driverUser.id, licenseNumber: "KA34-DL-99871", assignedBusId: busId });

  const driverUser2 = { id: uuid(), email: "driver2@bitm.edu", passwordHash: hash("driver123"), role: "driver" as const, name: "Suresh Naik", phone: "9900000002" };
  usersRepo.insert(driverUser2);
  const driverId2 = uuid();
  driversRepo.insert({ id: driverId2, userId: driverUser2.id, licenseNumber: "KA34-DL-99872", assignedBusId: busId2 });

  const studentSeeds = [
    { email: "shoaib@bitm.edu", name: "Shoaib Ahmed", roll: "1BT21CS045", pass: "PASS-0001", busId, routeId, pickupIdx: 3, feeStatus: "PAID" as const },
    { email: "priya@bitm.edu", name: "Priya Reddy", roll: "1BT21EC012", pass: "PASS-0002", busId, routeId, pickupIdx: 2, feeStatus: "PAID" as const },
    { email: "arjun@bitm.edu", name: "Arjun Patil", roll: "1BT21ME078", pass: "PASS-0003", busId: busId2, routeId: routeId2, pickupIdx: 1, feeStatus: "PENDING" as const }
  ];

  studentSeeds.forEach((s) => {
    const user = { id: uuid(), email: s.email, passwordHash: hash(s.email === "shoaib@bitm.edu" ? "student@123" : "student123"), role: "student" as const, name: s.name, phone: "9900000100" };
    usersRepo.insert(user);
    const studentId = uuid();
    const routeStops = s.busId === busId ? stops : stops2;
    studentsRepo.insert({
      id: studentId,
      userId: user.id,
      rollNumber: s.roll,
      routeId: s.routeId,
      assignedBusId: s.busId,
      pickupStopId: routeStops[s.pickupIdx].id
    });
    passesRepo.insert({
      id: uuid(), studentId, passNumber: s.pass, status: "valid",
      validFrom: "2026-06-01", validTo: s.email === "shoaib@bitm.edu" ? "2026-08-29" : "2027-05-31"
    });
    feesRepo.insert({
      id: uuid(), studentId, status: s.feeStatus, amount: 12000,
      dueDate: "2026-07-01", updatedAt: new Date().toISOString()
    });
  });

  console.log("Seed complete.");
  console.log("Login credentials:");
  console.log("  Admin:    admin@bitm.edu / admin123");
  console.log("  Driver 1: driver1@bitm.edu / driver123  (Bus KA-34-F-1234, Route 05)");
  console.log("  Driver 2: driver2@bitm.edu / driver123  (Bus KA-34-F-5678, Route 12)");
  console.log("  Student:  shoaib@bitm.edu / student@123 (Pass PASS-0001, expires 2026-08-29, fee PAID)");
  console.log("  Student:  priya@bitm.edu / student123   (Pass PASS-0002, fee PAID)");
  console.log("  Student:  arjun@bitm.edu / student123   (Pass PASS-0003, fee PENDING -> will be DENIED)");
}

seed();
