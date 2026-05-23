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

  const mechCount = db.prepare("SELECT COUNT(*) AS c FROM mechanics").get().c;
  if (mechCount === 0) {
    const insert = db.prepare(
      `INSERT INTO mechanics (id, name, email, phone, role, jobs_completed, rating, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Active')`,
    );
    insert.run(randomUUID(), "Tom Reilly", "tom@yovaauto.co.uk", "+44 7700 900101", "Lead Mechanic", 128, 4.9);
    insert.run(randomUUID(), "Sarah Mills", "sarah@yovaauto.co.uk", "+44 7700 900102", "Mechanic", 94, 4.7);
    insert.run(randomUUID(), "Mike Patel", "mike@yovaauto.co.uk", "+44 7700 900103", "Mechanic", 76, 4.8);
  }
}
