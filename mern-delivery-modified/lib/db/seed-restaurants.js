const API_BASE = "http://localhost:3001";

async function getAuthToken(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (res.ok) {
    const data = await res.json();
    return data.token;
  }
  throw new Error(`Login failed for ${email}: ${res.status}`);
}

async function createRestaurant(token, restaurant) {
  const res = await fetch(`${API_BASE}/api/restaurants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(restaurant),
  });

  if (res.ok) {
    const data = await res.json();
    console.log(`✓ Created restaurant: ${data.name} (${data.id})`);
    return data;
  }
  throw new Error(`Failed to create restaurant: ${await res.text()}`);
}

async function createMenuCategory(token, restaurantId, category) {
  const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(category),
  });

  if (res.ok) {
    const data = await res.json();
    console.log(`  ├─ Category: ${data.name}`);
    return data;
  }
  throw new Error(
    `Failed to create category for restaurant ${restaurantId}: ${await res.text()}`
  );
}

async function createMenuItem(token, restaurantId, item) {
  const res = await fetch(`${API_BASE}/api/restaurants/${restaurantId}/menu`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(item),
  });

  if (res.ok) {
    const data = await res.json();
    console.log(`    ├─ ${data.name} - $${data.price}`);
    return data;
  }
  throw new Error(`Failed to create menu item: ${await res.text()}`);
}

async function seedRestaurantsAndMenus() {
  console.log("🌱 Seeding restaurants and menu items...\n");

  try {
    // Get tokens for restaurant owners
    console.log("📝 Getting auth tokens...");
    const marioToken = await getAuthToken("mario@qb.com", "pass123");
    const chenToken = await getAuthToken("chen@qb.com", "pass123");
    console.log("✓ Auth tokens obtained\n");

    // Create Mario's Pizza Palace
    console.log("🏪 Creating restaurants...\n");
    const marioRestaurant = await createRestaurant(marioToken, {
      name: "Mario's Pizza Palace",
      description: "Authentic Italian pizza and pasta dishes",
      cuisine: "Italian",
      address: "123 Main Street, Downtown",
      phone: "555-0001",
      deliveryTime: 35,
      deliveryFee: 2.99,
      minOrder: 10.00,
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400",
      coverImage: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=800",
    });

    // Add categories and items for Mario's
    const pizzaCategory = await createMenuCategory(marioToken, marioRestaurant.id, {
      name: "Pizzas",
      description: "Our signature pizzas",
      sortOrder: 1,
    });

    const pastaCategory = await createMenuCategory(marioToken, marioRestaurant.id, {
      name: "Pastas",
      description: "Traditional Italian pasta",
      sortOrder: 2,
    });

    const appetizerCategory = await createMenuCategory(marioToken, marioRestaurant.id, {
      name: "Appetizers",
      description: "Starters",
      sortOrder: 0,
    });

    // Add pizza items
    const pizzas = [
      {
        name: "Margherita",
        description: "Fresh mozzarella, tomato, basil",
        price: 12.99,
        categoryId: pizzaCategory.id,
        isPopular: true,
        image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=300",
      },
      {
        name: "Pepperoni",
        description: "Pepperoni, mozzarella, tomato sauce",
        price: 14.99,
        categoryId: pizzaCategory.id,
        isPopular: true,
        image: "https://images.unsplash.com/photo-1628840042765-356cda07f428?w=300",
      },
      {
        name: "Vegetarian",
        description: "Bell peppers, mushrooms, olives, onions",
        price: 13.99,
        categoryId: pizzaCategory.id,
        isVegetarian: true,
        image: "https://images.unsplash.com/photo-1511689915726-cd4628902d4a?w=300",
      },
      {
        name: "BBQ Chicken",
        description: "Grilled chicken, BBQ sauce, red onions",
        price: 15.99,
        categoryId: pizzaCategory.id,
        image: "https://images.unsplash.com/photo-1565299624946-b28974268df0?w=300",
      },
    ];

    for (const pizza of pizzas) {
      await createMenuItem(marioToken, marioRestaurant.id, pizza);
    }

    // Add pasta items
    const pastas = [
      {
        name: "Spaghetti Carbonara",
        description: "Egg, pancetta, parmesan",
        price: 11.99,
        categoryId: pastaCategory.id,
        image: "https://images.unsplash.com/photo-1612874742237-6526221fcf4f?w=300",
      },
      {
        name: "Fettuccine Alfredo",
        description: "Fettuccine with creamy alfredo sauce",
        price: 10.99,
        categoryId: pastaCategory.id,
        isVegetarian: true,
        image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=300",
      },
      {
        name: "Lasagna",
        description: "Layers of pasta, meat sauce, cheese",
        price: 12.99,
        categoryId: pastaCategory.id,
        isPopular: true,
        image: "https://images.unsplash.com/photo-1587997671499-b0474c05b7d4?w=300",
      },
    ];

    for (const pasta of pastas) {
      await createMenuItem(marioToken, marioRestaurant.id, pasta);
    }

    // Add appetizers
    const appetizers = [
      {
        name: "Garlic Bread",
        description: "Toasted bread with garlic butter",
        price: 4.99,
        categoryId: appetizerCategory.id,
        isVegetarian: true,
        image: "https://images.unsplash.com/photo-1599599810694-b5ac4dd64b73?w=300",
      },
      {
        name: "Bruschetta",
        description: "Toasted bread with tomato, basil, olive oil",
        price: 5.99,
        categoryId: appetizerCategory.id,
        isVegetarian: true,
        image: "https://images.unsplash.com/photo-1572368470508-dadf60bcf25a?w=300",
      },
    ];

    for (const item of appetizers) {
      await createMenuItem(marioToken, marioRestaurant.id, item);
    }

    console.log();

    // Create Dragon Wok
    const chenRestaurant = await createRestaurant(chenToken, {
      name: "Dragon Wok",
      description: "Authentic Chinese cuisine with fresh ingredients",
      cuisine: "Chinese",
      address: "456 Oak Avenue, Chinatown",
      phone: "555-0002",
      deliveryTime: 30,
      deliveryFee: 1.99,
      minOrder: 8.00,
      rating: 4.7,
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400",
      coverImage: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800",
    });

    // Add categories for Dragon Wok
    const noodlesCategory = await createMenuCategory(chenToken, chenRestaurant.id, {
      name: "Noodles",
      description: "Stir-fried noodle dishes",
      sortOrder: 1,
    });

    const riceCategory = await createMenuCategory(chenToken, chenRestaurant.id, {
      name: "Rice Dishes",
      description: "Fried rice and rice bowls",
      sortOrder: 2,
    });

    const soupCategory = await createMenuCategory(chenToken, chenRestaurant.id, {
      name: "Soups",
      description: "Traditional Chinese soups",
      sortOrder: 0,
    });

    // Add noodle items
    const noodles = [
      {
        name: "Chow Mein",
        description: "Stir-fried noodles with vegetables and sauce",
        price: 10.99,
        categoryId: noodlesCategory.id,
        isPopular: true,
        image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=300",
      },
      {
        name: "Lo Mein",
        description: "Soft noodles with soy sauce and vegetables",
        price: 10.99,
        categoryId: noodlesCategory.id,
        image: "https://images.unsplash.com/photo-1606787620884-c87db79a01d4?w=300",
      },
      {
        name: "Pad Thai",
        description: "Thai noodles with peanut sauce, egg, vegetables",
        price: 11.99,
        categoryId: noodlesCategory.id,
        image: "https://images.unsplash.com/photo-1511689915726-cd4628902d4a?w=300",
      },
    ];

    for (const noodle of noodles) {
      await createMenuItem(chenToken, chenRestaurant.id, noodle);
    }

    // Add rice items
    const riceItems = [
      {
        name: "Fried Rice",
        description: "Fried rice with egg, vegetables, and soy sauce",
        price: 9.99,
        categoryId: riceCategory.id,
        isPopular: true,
        image: "https://images.unsplash.com/photo-1606787620884-c87db79a01d4?w=300",
      },
      {
        name: "Chicken Teriyaki Rice",
        description: "Grilled chicken with teriyaki glaze over rice",
        price: 12.99,
        categoryId: riceCategory.id,
        image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300",
      },
      {
        name: "Vegetable Lo Mein",
        description: "Soft noodles with mixed vegetables",
        price: 8.99,
        categoryId: riceCategory.id,
        isVegetarian: true,
        image: "https://images.unsplash.com/photo-1609501676725-7186f017a4b8?w=300",
      },
    ];

    for (const item of riceItems) {
      await createMenuItem(chenToken, chenRestaurant.id, item);
    }

    // Add soup items
    const soups = [
      {
        name: "Hot and Sour Soup",
        description: "Spicy and tangy soup with tofu and mushrooms",
        price: 5.99,
        categoryId: soupCategory.id,
        image: "https://images.unsplash.com/photo-1547521868-e0a0451c91a3?w=300",
      },
      {
        name: "Egg Drop Soup",
        description: "Silky soup with eggs and vegetables",
        price: 4.99,
        categoryId: soupCategory.id,
        image: "https://images.unsplash.com/photo-1516032903527-f992f8fef5b6?w=300",
      },
    ];

    for (const soup of soups) {
      await createMenuItem(chenToken, chenRestaurant.id, soup);
    }

    console.log("\n✅ Seeding complete!");
    console.log("🎉 Restaurants are now fully functional with menu items!");
    console.log("\nYou can now:");
    console.log("  • Browse restaurants on the home page");
    console.log("  • View menu items for each restaurant");
    console.log("  • Add items to cart");
    console.log("  • Place orders");
    console.log("  • Manage orders in the restaurant dashboard");
  } catch (error) {
    console.error("❌ Seed error:", error.message);
    process.exit(1);
  }
}

seedRestaurantsAndMenus();
