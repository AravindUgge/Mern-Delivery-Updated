import pkg from "pg";
import { randomUUID } from "crypto";

const { Pool } = pkg;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function ensureCustomer(client) {
  const email = "customer@qb.com";
  const result = await client.query(
    `INSERT INTO users (name, email, password_hash, role, phone, address, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET name = users.name
     RETURNING id`,
    ["Demo Customer", email, "", "customer", "555-1000", "101 Customer Lane"],
  );

  return result.rows[0].id;
}

async function getRestaurantId(client, name) {
  const result = await client.query(`SELECT id FROM restaurants WHERE name = $1 LIMIT 1`, [name]);
  return result.rows[0]?.id ?? null;
}

async function getMenuItems(client, restaurantId) {
  const result = await client.query(`SELECT id, name, price, image FROM menu_items WHERE restaurant_id = $1 ORDER BY name LIMIT 10`, [restaurantId]);
  return result.rows;
}

async function insertOrder(client, order) {
  await client.query(
    `INSERT INTO orders (id, user_id, restaurant_id, restaurant_name, items, status, subtotal, delivery_fee, total, delivery_address, notes, estimated_delivery, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
     ON CONFLICT (id) DO NOTHING`,
    [
      order.id,
      order.userId,
      order.restaurantId,
      order.restaurantName,
      JSON.stringify(order.items),
      order.status,
      order.subtotal,
      order.deliveryFee,
      order.total,
      order.deliveryAddress,
      order.notes,
      order.estimatedDelivery,
      order.createdAt,
    ],
  );
}

async function seed() {
  const client = await pool.connect();
  try {
    console.log("Seeding sample restaurant orders...");

    const customerId = await ensureCustomer(client);
    const pizzaRestaurantId = await getRestaurantId(client, "Mario's Pizza Palace");
    const wokRestaurantId = await getRestaurantId(client, "Dragon Wok");

    if (!pizzaRestaurantId || !wokRestaurantId) {
      throw new Error("Restaurants not found. Run the restaurant seed script first.");
    }

    const pizzaItems = await getMenuItems(client, pizzaRestaurantId);
    const wokItems = await getMenuItems(client, wokRestaurantId);

    if (pizzaItems.length < 2 || wokItems.length < 2) {
      throw new Error("Not enough menu items found for one or more restaurants.");
    }

    const pizzaOrder = {
      id: randomUUID(),
      userId: customerId,
      restaurantId: pizzaRestaurantId,
      restaurantName: "Mario's Pizza Palace",
      items: [
        { menuItemId: pizzaItems[0].id, name: pizzaItems[0].name, price: parseFloat(pizzaItems[0].price), quantity: 1, image: pizzaItems[0].image },
        { menuItemId: pizzaItems[1].id, name: pizzaItems[1].name, price: parseFloat(pizzaItems[1].price), quantity: 2, image: pizzaItems[1].image },
      ],
      status: "pending",
      subtotal: String((parseFloat(pizzaItems[0].price) + parseFloat(pizzaItems[1].price) * 2).toFixed(2)),
      deliveryFee: "2.99",
      total: String((parseFloat(pizzaItems[0].price) + parseFloat(pizzaItems[1].price) * 2 + 2.99).toFixed(2)),
      deliveryAddress: "221B Baker Street, City Center",
      notes: "Extra garlic, please",
      estimatedDelivery: 35,
      createdAt: new Date().toISOString(),
    };

    const wokOrder = {
      id: randomUUID(),
      userId: customerId,
      restaurantId: wokRestaurantId,
      restaurantName: "Dragon Wok",
      items: [
        { menuItemId: wokItems[0].id, name: wokItems[0].name, price: parseFloat(wokItems[0].price), quantity: 1, image: wokItems[0].image },
        { menuItemId: wokItems[1].id, name: wokItems[1].name, price: parseFloat(wokItems[1].price), quantity: 1, image: wokItems[1].image },
      ],
      status: "preparing",
      subtotal: String((parseFloat(wokItems[0].price) + parseFloat(wokItems[1].price)).toFixed(2)),
      deliveryFee: "1.99",
      total: String((parseFloat(wokItems[0].price) + parseFloat(wokItems[1].price) + 1.99).toFixed(2)),
      deliveryAddress: "221B Baker Street, City Center",
      notes: "No peanuts",
      estimatedDelivery: 30,
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    };

    const readyOrder = {
      id: randomUUID(),
      userId: customerId,
      restaurantId: pizzaRestaurantId,
      restaurantName: "Mario's Pizza Palace",
      items: [
        { menuItemId: pizzaItems[2].id, name: pizzaItems[2].name, price: parseFloat(pizzaItems[2].price), quantity: 1, image: pizzaItems[2].image },
      ],
      status: "ready",
      subtotal: String(parseFloat(pizzaItems[2].price).toFixed(2)),
      deliveryFee: "2.99",
      total: String((parseFloat(pizzaItems[2].price) + 2.99).toFixed(2)),
      deliveryAddress: "221B Baker Street, City Center",
      notes: "Please hurry",
      estimatedDelivery: 35,
      createdAt: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    };

    await insertOrder(client, pizzaOrder);
    await insertOrder(client, wokOrder);
    await insertOrder(client, readyOrder);

    console.log("✓ Sample orders seeded. Restaurant dashboard will now show separate order status entries.");
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
