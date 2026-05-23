import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "./db.js";

export function seedIfEmpty() {
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const id = randomUUID();
    const hash = bcrypt.hashSync("admin", 10);
    db.prepare(
      "INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)",
    ).run(id, "admin@yovaauto.co.uk", hash, "Admin");
  }
}
