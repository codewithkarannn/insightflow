using Microsoft.Data.Sqlite;

namespace InsightFlow.Api;

public static class DatabaseSeeder
{
    public static string Seed(string dbPath)
    {
        var connectionString = $"Data Source={dbPath}";

        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        // 1. Check if 5,000 orders dataset already exists
        using (var checkCmd = connection.CreateCommand())
        {
            checkCmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Orders';";
            var count = Convert.ToInt32(checkCmd.ExecuteScalar());
            if (count > 0)
            {
                using var countOrdersCmd = connection.CreateCommand();
                countOrdersCmd.CommandText = "SELECT COUNT(*) FROM Orders;";
                var orderCount = Convert.ToInt32(countOrdersCmd.ExecuteScalar());
                if (orderCount >= 5000)
                {
                    return connectionString; // Already seeded with 5,000+ orders
                }
            }
        }

        // 2. Drop existing tables for fresh clean seeding
        var dropTablesSql = """
            DROP TABLE IF EXISTS OrderItems;
            DROP TABLE IF EXISTS Orders;
            DROP TABLE IF EXISTS Products;
            DROP TABLE IF EXISTS Categories;
            DROP TABLE IF EXISTS Customers;
        """;

        using (var dropCmd = connection.CreateCommand())
        {
            dropCmd.CommandText = dropTablesSql;
            dropCmd.ExecuteNonQuery();
        }

        // 3. Create High-Performance Enterprise Relational Schema
        var createTablesSql = """
            CREATE TABLE Categories (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                CategoryName TEXT NOT NULL,
                Description TEXT NOT NULL
            );

            CREATE TABLE Products (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                CategoryId INTEGER NOT NULL,
                ProductName TEXT NOT NULL,
                UnitPrice REAL NOT NULL,
                StockQuantity INTEGER NOT NULL,
                FOREIGN KEY (CategoryId) REFERENCES Categories(Id)
            );

            CREATE TABLE Customers (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                FullName TEXT NOT NULL,
                Email TEXT NOT NULL,
                City TEXT NOT NULL,
                Country TEXT NOT NULL DEFAULT 'India',
                PasswordHash TEXT NOT NULL,
                CreditCardNumber TEXT NOT NULL
            );

            CREATE TABLE Orders (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                CustomerId INTEGER NOT NULL,
                OrderDate TEXT NOT NULL,
                TotalAmount REAL NOT NULL,
                Status TEXT NOT NULL,
                FOREIGN KEY (CustomerId) REFERENCES Customers(Id)
            );

            CREATE TABLE OrderItems (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                OrderId INTEGER NOT NULL,
                ProductId INTEGER NOT NULL,
                Quantity INTEGER NOT NULL,
                UnitPrice REAL NOT NULL,
                FOREIGN KEY (OrderId) REFERENCES Orders(Id),
                FOREIGN KEY (ProductId) REFERENCES Products(Id)
            );

            CREATE INDEX IF NOT EXISTS idx_orders_date ON Orders(OrderDate);
            CREATE INDEX IF NOT EXISTS idx_orders_customer ON Orders(CustomerId);
            CREATE INDEX IF NOT EXISTS idx_products_category ON Products(CategoryId);
            CREATE INDEX IF NOT EXISTS idx_orderitems_order ON OrderItems(OrderId);
        """;

        using (var createCmd = connection.CreateCommand())
        {
            createCmd.CommandText = createTablesSql;
            createCmd.ExecuteNonQuery();
        }

        // 4. Seed High-Volume Programmatic Data inside a single fast Transaction
        using var tx = connection.BeginTransaction();
        var rng = new Random(42); // Deterministic seed for reproducible analytical tests

        // A. Insert 10 Categories
        var categories = new[]
        {
            ("Electronics", "Computers, laptops, monitors, and processing tech"),
            ("Audio & Sound", "Headphones, soundbars, studio monitors, and mics"),
            ("Furniture & Office", "Ergonomic chairs, motorized standing desks, and office setup"),
            ("Wearables & Fitness", "Smartwatches, fitness bands, and health tracking rings"),
            ("Accessories", "Mechanical keyboards, mice, USB docks, and power banks"),
            ("Home Appliances", "Smart espresso machines, air purifiers, and vacuums"),
            ("Software & Cloud", "Operating systems, developer IDEs, and security licenses"),
            ("Gaming Gear", "Controllers, flight sticks, VR headsets, and gaming rigs"),
            ("Photography & Video", "Mirrorless cameras, lenses, tripods, and gimbals"),
            ("Networking & Smart Home", "Wi-Fi 7 routers, NAS storage drives, and mesh nodes")
        };

        using (var catCmd = connection.CreateCommand())
        {
            catCmd.Transaction = tx;
            catCmd.CommandText = "INSERT INTO Categories (CategoryName, Description) VALUES (@name, @desc);";
            var nameParam = catCmd.Parameters.Add("@name", SqliteType.Text);
            var descParam = catCmd.Parameters.Add("@desc", SqliteType.Text);

            foreach (var (name, desc) in categories)
            {
                nameParam.Value = name;
                descParam.Value = desc;
                catCmd.ExecuteNonQuery();
            }
        }

        // B. Insert 100 Customers across 12 Cities
        var firstNames = new[] { "Karan", "Priya", "Rahul", "Ananya", "Vikram", "Sneha", "Rajesh", "Neha", "Amit", "Pooja", "Rohan", "Deepika", "Suresh", "Kavita", "Siddharth", "Meera", "Arjun", "Ritu", "Manish", "Sunita" };
        var lastNames = new[] { "Vishwakarma", "Patel", "Sharma", "Roy", "Singh", "Kulkarni", "Gupta", "Iyer", "Banerjee", "Verma", "Mehta", "Joshi", "Rao", "Nair", "Malhotra", "Saxena", "Reddy", "Choudhury", "Deshmukh", "Agarwal" };
        var cities = new[] { "Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Surat", "Lucknow", "Chandigarh" };

        using (var custCmd = connection.CreateCommand())
        {
            custCmd.Transaction = tx;
            custCmd.CommandText = """
                INSERT INTO Customers (FullName, Email, City, Country, PasswordHash, CreditCardNumber) 
                VALUES (@name, @email, @city, 'India', @pass, @card);
            """;
            var nameParam = custCmd.Parameters.Add("@name", SqliteType.Text);
            var emailParam = custCmd.Parameters.Add("@email", SqliteType.Text);
            var cityParam = custCmd.Parameters.Add("@city", SqliteType.Text);
            var passParam = custCmd.Parameters.Add("@pass", SqliteType.Text);
            var cardParam = custCmd.Parameters.Add("@card", SqliteType.Text);

            for (int i = 1; i <= 100; i++)
            {
                string fn = firstNames[rng.Next(firstNames.Length)];
                string ln = lastNames[rng.Next(lastNames.Length)];
                string fullName = $"{fn} {ln}";
                string email = $"{fn.ToLower()}.{ln.ToLower()}{i}@example.com";
                string city = cities[rng.Next(cities.Length)];
                string pass = $"hash_sec_{i:D4}";
                string card = $"4111-{rng.Next(1000, 9999)}-{rng.Next(1000, 9999)}-{rng.Next(1000, 9999)}";

                nameParam.Value = fullName;
                emailParam.Value = email;
                cityParam.Value = city;
                passParam.Value = pass;
                cardParam.Value = card;
                custCmd.ExecuteNonQuery();
            }
        }

        // C. Insert 500 Products (50 per Category)
        var productAdjectives = new[] { "Pro", "Ultra", "Max", "Lite", "Studio", "Enterprise", "Essential", "Compact", "Wireless", "Smart" };
        var productBases = new[]
        {
            new[] { "Laptop", "Monitor", "Tablet", "Mini PC", "Workstation", "Desktop", "eReader", "Server" }, // Cat 1
            new[] { "Headphones", "Soundbar", "Speaker", "Earbuds", "Microphone", "DAC Amplifier", "Subwoofer" }, // Cat 2
            new[] { "Ergonomic Chair", "Standing Desk", "Desk Mat", "Monitor Arm", "Footrest", "Cabinet" }, // Cat 3
            new[] { "Smartwatch", "Fitness Tracker", "Health Ring", "GPS Sports Watch", "Pulse Sensor" }, // Cat 4
            new[] { "Mechanical Keyboard", "Vertical Mouse", "USB Dock", "Power Bank", "Cable Hub", "Mousepad" }, // Cat 5
            new[] { "Coffee Machine", "Air Purifier", "Robot Vacuum", "Smart Blender", "Dehumidifier" }, // Cat 6
            new[] { "OS License", "IDE Pro", "Cloud Backup", "Security Suite", "Database Studio", "VPN Pro" }, // Cat 7
            new[] { "Game Controller", "Flight Stick", "Racing Wheel", "VR Headset", "Arcade Joystick" }, // Cat 8
            new[] { "Mirrorless Camera", "Prime Lens", "Carbon Tripod", "Gimbal Stabilizer", "LED Video Light" }, // Cat 9
            new[] { "Wi-Fi 7 Router", "NAS Storage Enclosure", "Mesh Node", "Gigabit Switch", "Smart Plug" } // Cat 10
        };

        var productPrices = new List<double>();
        var productIds = new List<int>();

        using (var prodCmd = connection.CreateCommand())
        {
            prodCmd.Transaction = tx;
            prodCmd.CommandText = """
                INSERT INTO Products (CategoryId, ProductName, UnitPrice, StockQuantity) 
                VALUES (@catId, @pName, @price, @stock);
            """;
            var catParam = prodCmd.Parameters.Add("@catId", SqliteType.Integer);
            var nameParam = prodCmd.Parameters.Add("@pName", SqliteType.Text);
            var priceParam = prodCmd.Parameters.Add("@price", SqliteType.Real);
            var stockParam = prodCmd.Parameters.Add("@stock", SqliteType.Integer);

            int pIdCounter = 1;
            for (int catId = 1; catId <= 10; catId++)
            {
                var baseList = productBases[catId - 1];
                for (int i = 0; i < 50; i++)
                {
                    string adj = productAdjectives[rng.Next(productAdjectives.Length)];
                    string baseName = baseList[rng.Next(baseList.Length)];
                    string pName = $"{adj} {baseName} v{i + 1}";
                    
                    double price = catId switch
                    {
                        1 => rng.Next(25000, 249999),
                        2 => rng.Next(1999, 45000),
                        3 => rng.Next(1499, 55000),
                        4 => rng.Next(2999, 35000),
                        5 => rng.Next(499, 12999),
                        6 => rng.Next(4999, 65000),
                        7 => rng.Next(999, 29999),
                        8 => rng.Next(3499, 89999),
                        9 => rng.Next(5999, 189999),
                        _ => rng.Next(2499, 75000)
                    };

                    int stock = rng.Next(10, 500);

                    catParam.Value = catId;
                    nameParam.Value = pName;
                    priceParam.Value = price;
                    stockParam.Value = stock;
                    prodCmd.ExecuteNonQuery();

                    productIds.Add(pIdCounter++);
                    productPrices.Add(price);
                }
            }
        }

        // D. Insert 5,000 Orders over 6 Months (March 1, 2026 to August 9, 2026)
        var statuses = new[] { "Completed", "Completed", "Completed", "Completed", "Completed", "Completed", "Completed", "Shipped", "Shipped", "Processing", "Pending", "Cancelled" };
        var startDate = new DateTime(2026, 3, 1);
        var endDate = new DateTime(2026, 8, 9);
        int totalDays = (endDate - startDate).Days;

        using var orderCmd = connection.CreateCommand();
        orderCmd.Transaction = tx;
        orderCmd.CommandText = """
            INSERT INTO Orders (CustomerId, OrderDate, TotalAmount, Status) 
            VALUES (@cId, @oDate, @amount, @status);
            SELECT last_insert_rowid();
        """;
        var cIdParam = orderCmd.Parameters.Add("@cId", SqliteType.Integer);
        var oDateParam = orderCmd.Parameters.Add("@oDate", SqliteType.Text);
        var amountParam = orderCmd.Parameters.Add("@amount", SqliteType.Real);
        var statusParam = orderCmd.Parameters.Add("@status", SqliteType.Text);

        using var itemCmd = connection.CreateCommand();
        itemCmd.Transaction = tx;
        itemCmd.CommandText = """
            INSERT INTO OrderItems (OrderId, ProductId, Quantity, UnitPrice) 
            VALUES (@oId, @pId, @qty, @uPrice);
        """;
        var oIdParam = itemCmd.Parameters.Add("@oId", SqliteType.Integer);
        var pIdParam = itemCmd.Parameters.Add("@pId", SqliteType.Integer);
        var qtyParam = itemCmd.Parameters.Add("@qty", SqliteType.Integer);
        var uPriceParam = itemCmd.Parameters.Add("@uPrice", SqliteType.Real);

        for (int orderId = 1; orderId <= 5000; orderId++)
        {
            int custId = rng.Next(1, 101);
            DateTime randomDate = startDate.AddDays(rng.Next(0, totalDays + 1)).AddHours(rng.Next(8, 22)).AddMinutes(rng.Next(0, 60));
            string dateStr = randomDate.ToString("yyyy-MM-dd");
            string status = statuses[rng.Next(statuses.Length)];

            // Insert 1 to 3 items per order
            int itemCount = rng.Next(1, 4);
            double totalOrderAmount = 0.0;

            // Insert order placeholder first
            cIdParam.Value = custId;
            oDateParam.Value = dateStr;
            amountParam.Value = 0.0; // Placeholder until items calculated
            statusParam.Value = status;
            orderCmd.ExecuteNonQuery();

            for (int k = 0; k < itemCount; k++)
            {
                int pIndex = rng.Next(0, productIds.Count);
                int prodId = productIds[pIndex];
                double unitPrice = productPrices[pIndex];
                int qty = rng.Next(1, 3);
                double lineTotal = unitPrice * qty;
                totalOrderAmount += lineTotal;

                oIdParam.Value = orderId;
                pIdParam.Value = prodId;
                qtyParam.Value = qty;
                uPriceParam.Value = unitPrice;
                itemCmd.ExecuteNonQuery();
            }

            // Update actual computed total amount for order
            using var updateAmtCmd = connection.CreateCommand();
            updateAmtCmd.Transaction = tx;
            updateAmtCmd.CommandText = "UPDATE Orders SET TotalAmount = @amt WHERE Id = @id;";
            updateAmtCmd.Parameters.AddWithValue("@amt", totalOrderAmount);
            updateAmtCmd.Parameters.AddWithValue("@id", orderId);
            updateAmtCmd.ExecuteNonQuery();
        }

        tx.Commit();
        return connectionString;
    }
}