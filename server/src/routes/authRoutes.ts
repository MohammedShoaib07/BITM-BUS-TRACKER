import { Router } from "express";
import bcrypt from "bcryptjs";
import { usersRepo, studentsRepo, driversRepo } from "../data/repositories";
import { signToken } from "../middleware/auth";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const user = usersRepo.findOneWhere((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: "Invalid credentials." });

  if ((user as any).role === "student") return res.status(403).json({ error: "Student login is not required. Choose a bus to track." });

  const ok = bcrypt.compareSync(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials." });

  const token = signToken({ userId: user.id, role: user.role, name: user.name });

  let profile: any = { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone };
  if (user.role === "student") {
    profile.student = studentsRepo.findOneWhere((s) => s.userId === user.id);
  }
  if (user.role === "driver") {
    profile.driver = driversRepo.findOneWhere((d) => d.userId === user.id);
  }

  res.json({ token, user: profile });
});

router.get("/me", (req, res) => {
  res.json({ ok: true });
});

export default router;
