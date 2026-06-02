const API_BASE = "http://localhost:3001";

async function createTestUsers() {
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

  console.log("Creating test users via API...");

  for (const user of testUsers) {
    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✓ Created user: ${user.email}`);
      } else if (response.status === 400) {
        console.log(`⊘ User already exists: ${user.email}`);
      } else {
        console.error(`✗ Error creating ${user.email}:`, await response.text());
      }
    } catch (error) {
      console.error(`✗ Failed to create ${user.email}:`, error.message);
    }
  }

  console.log("✓ Done!");
}

createTestUsers();
