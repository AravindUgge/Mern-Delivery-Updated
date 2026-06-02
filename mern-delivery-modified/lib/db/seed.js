import bcrypt from "bcryptjs";
import pkg from "pg";
const { Pool } = pkg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function seed() {
  const client = await pool.connect();

  try {
    console.log("Seeding test users...");

    // Test users data
    const testUsers = [
      {
        name: "Mario's Pizza Palace",
        email: "mario@qb.com",
        password: "pass123",
        role: "restaurant_owner",
        phone: "555-0001",
        address: "123 Main St",
      },
      {
        name: "Dragon Wok",
        email: "chen@qb.com",
        password: "pass123",
        role: "restaurant_owner",
        phone: "555-0002",
        address: "456 Oak Ave",
      },
      {
        name: "Admin User",
        email: "admin@quickbite.com",
        password: "admin123",
        role: "admin",
        phone: "555-9999",
        address: "789 Admin St",
      },
    ];

    for (const user of testUsers) {
      const passwordHash = await bcrypt.hash(user.password, 12);

      const query = `
        INSERT INTO users (name, email, password_hash, role, phone, address, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email;
      `;

      const result = await client.query(query, [
        user.name,
        user.email,
        passwordHash,
        user.role,
        user.phone,
        user.address,
      ]);

      if (result.rows.length > 0) {
        console.log(`✓ Created user: ${result.rows[0].email}`);
      } else {
        console.log(`⊘ User already exists: ${user.email}`);
      }
    }

    console.log("✓ Seeding complete!");
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

seed();
