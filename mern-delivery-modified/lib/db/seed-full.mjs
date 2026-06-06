import pg from "pg";
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Pre-hashed passwords (bcryptjs hash("pass123", 12) and hash("admin123", 12))
const PASS_HASH = "$2b$12$NNx/plTYD4.deM0XQNZdNuaQP9ePxfRebBIyA.u7OY1PC2xCE01su";
const ADMIN_HASH = "$2b$12$tiytjRhjoVHyDc41XcsvZeHMJJeNw7gMKqTFAf6pkXKsSws1zkSrO";

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Seed users
    const users = [
      { name: "Mario's Pizza Palace", email: "mario@qb.com", role: "restaurant_owner", phone: "555-0001", address: "123 Main St" },
      { name: "Dragon Wok", email: "chen@qb.com", role: "restaurant_owner", phone: "555-0002", address: "456 Oak Ave" },
      { name: "Admin User", email: "admin@quickbite.com", role: "admin", phone: "555-9999", address: "789 Admin St" },
    ];

    const userIds = {};
    for (const u of users) {
      const hash = u.email === "admin@quickbite.com" ? ADMIN_HASH : PASS_HASH;
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone, address, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, email`,
        [u.name, u.email, hash, u.role, u.phone, u.address]
      );
      userIds[u.email] = res.rows[0].id;
      console.log(`✓ User: ${u.email} -> ${res.rows[0].id}`);
    }

    // Seed restaurants
    const restaurants = [
      {
        name: "Mario's Pizza Palace",
        description: "Authentic Italian pizza made with fresh ingredients and traditional recipes",
        cuisine: "Pizza",
        image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop",
        coverImage: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=400&fit=crop",
        address: "123 Main St, Downtown",
        phone: "555-0001",
        deliveryTime: 25,
        deliveryFee: "2.99",
        minOrder: "10.00",
        rating: "4.5",
        reviewCount: 128,
        isOpen: true,
        ownerId: userIds["mario@qb.com"],
      },
      {
        name: "Dragon Wok",
        description: "Traditional Chinese cuisine with a modern twist",
        cuisine: "Chinese",
        image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&h=300&fit=crop",
        coverImage: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&h=400&fit=crop",
        address: "456 Oak Ave, Midtown",
        phone: "555-0002",
        deliveryTime: 30,
        deliveryFee: "1.99",
        minOrder: "15.00",
        rating: "4.3",
        reviewCount: 87,
        isOpen: true,
        ownerId: userIds["chen@qb.com"],
      },
      {
        name: "Burger Barn",
        description: "Gourmet burgers and loaded fries",
        cuisine: "Burgers",
        image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
        coverImage: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&h=400&fit=crop",
        address: "789 Elm Blvd, Westside",
        phone: "555-0003",
        deliveryTime: 20,
        deliveryFee: "3.49",
        minOrder: "8.00",
        rating: "4.7",
        reviewCount: 215,
        isOpen: true,
        ownerId: userIds["mario@qb.com"],
      },
      {
        name: "Sakura Sushi",
        description: "Fresh sushi and Japanese specialties prepared by expert chefs",
        cuisine: "Sushi",
        image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop",
        coverImage: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=400&fit=crop",
        address: "321 Cherry Ln, Eastside",
        phone: "555-0004",
        deliveryTime: 35,
        deliveryFee: "4.99",
        minOrder: "20.00",
        rating: "4.8",
        reviewCount: 156,
        isOpen: true,
        ownerId: userIds["chen@qb.com"],
      },
    ];

    const restaurantIds = [];
    for (const r of restaurants) {
      const res = await client.query(
        `INSERT INTO restaurants (name, description, cuisine, image, cover_image, address, phone, delivery_time, delivery_fee, min_order, rating, review_count, is_open, owner_id, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
         RETURNING id, name`,
        [r.name, r.description, r.cuisine, r.image, r.coverImage, r.address, r.phone, r.deliveryTime, r.deliveryFee, r.minOrder, r.rating, r.reviewCount, r.isOpen, r.ownerId]
      );
      restaurantIds.push(res.rows[0].id);
      console.log(`✓ Restaurant: ${r.name} -> ${res.rows[0].id}`);
    }

    // Seed menu categories and items for Mario's Pizza Palace
    const marioCats = await client.query(
      `INSERT INTO menu_categories (name, description, restaurant_id, sort_order, created_at)
       VALUES ('Pizzas', 'Hand-tossed wood-fired pizzas', $1, 0, NOW()),
              ('Sides', 'Appetizers and sides', $1, 1, NOW()),
              ('Drinks', 'Refreshing beverages', $1, 2, NOW())
       RETURNING id, name`, [restaurantIds[0]]
    );
    console.log(`✓ Categories for Mario's (${marioCats.rows.length})`);

    const marioPizzaCat = marioCats.rows[0].id;
    const marioSidesCat = marioCats.rows[1].id;
    const marioDrinksCat = marioCats.rows[2].id;

    const marioItems = [
      { name: "Margherita Pizza", desc: "Fresh mozzarella, tomato sauce, basil", price: "12.99", cat: marioPizzaCat, img: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=200&h=200&fit=crop", popular: true, veg: true },
      { name: "Pepperoni Pizza", desc: "Classic pepperoni with melted mozzarella", price: "14.99", cat: marioPizzaCat, img: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=200&h=200&fit=crop", popular: true, veg: false },
      { name: "BBQ Chicken Pizza", desc: "Grilled chicken, BBQ sauce, red onion", price: "15.99", cat: marioPizzaCat, img: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop", popular: false, veg: false },
      { name: "Garlic Bread", desc: "Crispy garlic bread with herb butter", price: "4.99", cat: marioSidesCat, img: null, popular: false, veg: true },
      { name: "Mozzarella Sticks", desc: "Golden fried with marinara dipping sauce", price: "6.99", cat: marioSidesCat, img: null, popular: true, veg: true },
      { name: "Caesar Salad", desc: "Romaine, parmesan, croutons, caesar dressing", price: "7.99", cat: marioSidesCat, img: null, popular: false, veg: true },
      { name: "Coca-Cola", desc: "Classic refreshing cola", price: "1.99", cat: marioDrinksCat, img: null, popular: false, veg: true },
      { name: "Lemonade", desc: "Freshly squeezed lemonade", price: "2.99", cat: marioDrinksCat, img: null, popular: false, veg: true },
    ];

    for (const item of marioItems) {
      await client.query(
        `INSERT INTO menu_items (name, description, price, image, restaurant_id, category_id, is_available, is_popular, is_vegetarian, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,NOW(),NOW())`,
        [item.name, item.desc, item.price, item.img, restaurantIds[0], item.cat, item.popular, item.veg]
      );
    }
    console.log(`✓ Menu items for Mario's (${marioItems.length})`);

    // Seed menu for Dragon Wok
    const dragonCats = await client.query(
      `INSERT INTO menu_categories (name, description, restaurant_id, sort_order, created_at)
       VALUES ('Noodles', 'Hand-pulled and stir-fried noodles', $1, 0, NOW()),
              ('Rice Dishes', 'Classic rice plates', $1, 1, NOW()),
              ('Dim Sum', 'Traditional steamed dumplings', $1, 2, NOW())
       RETURNING id, name`, [restaurantIds[1]]
    );

    const dragonNoodleCat = dragonCats.rows[0].id;
    const dragonRiceCat = dragonCats.rows[1].id;
    const dragonDimSumCat = dragonCats.rows[2].id;

    const dragonItems = [
      { name: "Dan Dan Noodles", desc: "Spicy Sichuan noodles with minced pork", price: "11.99", cat: dragonNoodleCat, popular: true, veg: false },
      { name: "Chow Mein", desc: "Stir-fried egg noodles with vegetables", price: "10.99", cat: dragonNoodleCat, popular: false, veg: true },
      { name: "Kung Pao Chicken", desc: "Spicy chicken with peanuts and vegetables over rice", price: "13.99", cat: dragonRiceCat, popular: true, veg: false },
      { name: "Fried Rice", desc: "Wok-fried rice with egg and vegetables", price: "9.99", cat: dragonRiceCat, popular: false, veg: true },
      { name: "Pork Dumplings", desc: "Steamed pork and chive dumplings (6 pcs)", price: "7.99", cat: dragonDimSumCat, popular: true, veg: false },
      { name: "Vegetable Spring Rolls", desc: "Crispy spring rolls (4 pcs)", price: "5.99", cat: dragonDimSumCat, popular: false, veg: true },
    ];

    for (const item of dragonItems) {
      await client.query(
        `INSERT INTO menu_items (name, description, price, image, restaurant_id, category_id, is_available, is_popular, is_vegetarian, created_at, updated_at)
         VALUES ($1,$2,$3,null,$4,$5,true,$6,$7,NOW(),NOW())`,
        [item.name, item.desc, item.price, restaurantIds[1], item.cat, item.popular, item.veg]
      );
    }
    console.log(`✓ Menu items for Dragon Wok (${dragonItems.length})`);

    // Seed menu for Burger Barn
    const burgerCats = await client.query(
      `INSERT INTO menu_categories (name, description, restaurant_id, sort_order, created_at)
       VALUES ('Burgers', 'Signature gourmet burgers', $1, 0, NOW()),
              ('Fries', 'Loaded and classic fries', $1, 1, NOW())
       RETURNING id, name`, [restaurantIds[2]]
    );

    const burgerCatId = burgerCats.rows[0].id;
    const friesCatId = burgerCats.rows[1].id;

    const burgerItems = [
      { name: "Classic Smash Burger", desc: "Double smashed patties, American cheese, pickles", price: "11.99", cat: burgerCatId, popular: true, veg: false },
      { name: "Bacon BBQ Burger", desc: "Crispy bacon, smoked BBQ sauce, cheddar", price: "13.99", cat: burgerCatId, popular: true, veg: false },
      { name: "Mushroom Swiss", desc: "Sauteed mushrooms, Swiss cheese, truffle aioli", price: "12.99", cat: burgerCatId, popular: false, veg: false },
      { name: "Truffle Fries", desc: "Crispy fries with truffle oil and parmesan", price: "5.99", cat: friesCatId, popular: true, veg: true },
      { name: "Loaded Nacho Fries", desc: "Cheese, jalapenos, sour cream", price: "7.99", cat: friesCatId, popular: false, veg: true },
    ];

    for (const item of burgerItems) {
      await client.query(
        `INSERT INTO menu_items (name, description, price, image, restaurant_id, category_id, is_available, is_popular, is_vegetarian, created_at, updated_at)
         VALUES ($1,$2,$3,null,$4,$5,true,$6,$7,NOW(),NOW())`,
        [item.name, item.desc, item.price, restaurantIds[2], item.cat, item.popular, item.veg]
      );
    }
    console.log(`✓ Menu items for Burger Barn (${burgerItems.length})`);

    // Seed menu for Sakura Sushi
    const sushiCats = await client.query(
      `INSERT INTO menu_categories (name, description, restaurant_id, sort_order, created_at)
       VALUES ('Rolls', 'Signature maki rolls', $1, 0, NOW()),
              ('Sashimi', 'Fresh sliced fish', $1, 1, NOW())
       RETURNING id, name`, [restaurantIds[3]]
    );

    const sushiRollCat = sushiCats.rows[0].id;
    const sashimiCat = sushiCats.rows[1].id;

    const sushiItems = [
      { name: "California Roll", desc: "Crab, avocado, cucumber (8 pcs)", price: "10.99", cat: sushiRollCat, popular: true, veg: false },
      { name: "Spicy Tuna Roll", desc: "Spicy tuna, cucumber, sesame (8 pcs)", price: "12.99", cat: sushiRollCat, popular: true, veg: false },
      { name: "Dragon Roll", desc: "Eel, avocado, cucumber, eel sauce (8 pcs)", price: "14.99", cat: sushiRollCat, popular: false, veg: false },
      { name: "Salmon Sashimi", desc: "Fresh Atlantic salmon (5 slices)", price: "15.99", cat: sashimiCat, popular: true, veg: false },
      { name: "Tuna Sashimi", desc: "Fresh bluefin tuna (5 slices)", price: "16.99", cat: sashimiCat, popular: false, veg: false },
    ];

    for (const item of sushiItems) {
      await client.query(
        `INSERT INTO menu_items (name, description, price, image, restaurant_id, category_id, is_available, is_popular, is_vegetarian, created_at, updated_at)
         VALUES ($1,$2,$3,null,$4,$5,true,$6,$7,NOW(),NOW())`,
        [item.name, item.desc, item.price, restaurantIds[3], item.cat, item.popular, item.veg]
      );
    }
    console.log(`✓ Menu items for Sakura Sushi (${sushiItems.length})`);

    await client.query("COMMIT");
    console.log("\n🎉 Seeding complete! All data inserted.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
