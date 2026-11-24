import express from "express";
import pg from "pg";

const app = express();
const port = 3000;


const db = new pg.Client({
  user: "postgres",
  password: "123456",
  host: "localhost",
  port: 5432,
  database: "mystore",
});

db.connect();

app.use(express.static("public"));

const limit = 5;

app.get("/", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const offset = (page - 1) * limit;

    // 1 & 2. Customers count + paginated customers
    const resultCount = await db.query("SELECT count(*) FROM customers");
    const totalCustomers = Number(resultCount.rows[0].count);
    const totalPages = Math.ceil(totalCustomers / limit);

    const customersResult = await db.query(
      "SELECT * FROM customers ORDER BY id LIMIT $1 OFFSET $2",
      [limit, offset]
    );

    // 3. Total revenue from sales
    const revenueResult = await db.query(
      "SELECT COALESCE(SUM(saleamount), 0) AS total_revenue FROM sales"
    );
    const totalRevenue = Number(revenueResult.rows[0].total_revenue);

    // 4. Total orders count
    const ordersCountResult = await db.query("SELECT count(*) FROM orders");
    const totalOrders = Number(ordersCountResult.rows[0].count);

    // 5. Issues count (for top card)
    const issuesCountResult = await db.query(
      "SELECT count(*) FROM alerts WHERE type = 'issues'"
    );
    const totalIssues = Number(issuesCountResult.rows[0].count);

    // 6–8. Alerts split by type (issues, notifications, tasks)
    const alertsResult = await db.query(
      "SELECT id, type, description FROM alerts ORDER BY id"
    );
    const issues = alertsResult.rows.filter((row) => row.type === "issues");
    const notifications = alertsResult.rows.filter(
      (row) => row.type === "notifications"
    );
    const tasks = alertsResult.rows.filter((row) => row.type === "tasks");

    // 9–10. Products & sales summary
    const productsResult = await db.query(
      "SELECT id, name, price, quantity FROM products ORDER BY id"
    );
    const salesResult = await db.query(
      `SELECT s.id, p.name AS product_name, s.quantity, s.saleamount
       FROM sales s
       JOIN products p ON s.productid = p.id
       ORDER BY s.id`
    );

    res.render("index.ejs", {
      customers: customersResult.rows,
      totalCustomers,
      currentPage: page,
      totalPages,
      totalRevenue,
      totalOrders,
      totalIssues,
      issues,
      notifications,
      tasks,
      products: productsResult.rows,
      sales: salesResult.rows,
    });
  } catch (err) {
    res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});