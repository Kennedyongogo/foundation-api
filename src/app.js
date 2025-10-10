const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const { initializeModels, setupAssociations } = require("./models");
const { errorHandler } = require("./middleware/errorHandler");

// Import all routes
const adminUserRoutes = require("./routes/adminUserRoutes");
const inquiryRoutes = require("./routes/inquiryRoutes");
const projectRoutes = require("./routes/projectRoutes");
const documentRoutes = require("./routes/documentRoutes");
const auditTrailRoutes = require("./routes/auditTrailRoutes");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

// Debug logging middleware
app.use((req, res, next) => {
  console.log(`🔍 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`📦 Body:`, req.body);
  }
  next();
});

// Static file serving
const profilesUploadPath = path.join(__dirname, "..", "uploads", "profiles");
const documentsUploadPath = path.join(__dirname, "..", "uploads", "documents");
const projectsUploadPath = path.join(__dirname, "..", "uploads", "projects");
const inquiriesUploadPath = path.join(__dirname, "..", "uploads", "inquiries");
const miscUploadPath = path.join(__dirname, "..", "uploads", "misc");

console.log("📁 Upload Paths:");
console.log("  - Profiles:", profilesUploadPath, "- Exists:", fs.existsSync(profilesUploadPath));
console.log("  - Documents:", documentsUploadPath, "- Exists:", fs.existsSync(documentsUploadPath));
console.log("  - Projects:", projectsUploadPath, "- Exists:", fs.existsSync(projectsUploadPath));
console.log("  - Inquiries:", inquiriesUploadPath, "- Exists:", fs.existsSync(inquiriesUploadPath));
console.log("  - Misc:", miscUploadPath, "- Exists:", fs.existsSync(miscUploadPath));

// Serve static files
app.use("/uploads/profiles", express.static(profilesUploadPath));
app.use("/uploads/documents", express.static(documentsUploadPath));
app.use("/uploads/projects", express.static(projectsUploadPath));
app.use("/uploads/inquiries", express.static(inquiriesUploadPath));
app.use("/uploads/misc", express.static(miscUploadPath));

// API routes
console.log("🔗 Registering API routes...");

app.use("/api/admin-users", adminUserRoutes);
console.log("✅ /api/admin-users route registered");

app.use("/api/inquiries", inquiryRoutes);
console.log("✅ /api/inquiries route registered");

app.use("/api/projects", projectRoutes);
console.log("✅ /api/projects route registered");

app.use("/api/documents", documentRoutes);
console.log("✅ /api/documents route registered");

app.use("/api/audit-trail", auditTrailRoutes);
console.log("✅ /api/audit-trail route registered");

app.use("/api/reports", reportRoutes);
console.log("✅ /api/reports route registered");

console.log("✅ All API routes registered");

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// 404 handler for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Create upload directories if they don't exist
const createUploadDirectories = () => {
  const uploadDirs = [
    path.join(__dirname, "..", "uploads"),
    path.join(__dirname, "..", "uploads", "profiles"),
    path.join(__dirname, "..", "uploads", "documents"),
    path.join(__dirname, "..", "uploads", "projects"),
    path.join(__dirname, "..", "uploads", "inquiries"),
    path.join(__dirname, "..", "uploads", "misc"),
  ];

  uploadDirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created upload directory: ${dir}`);
    }
  });
};

// Initialize models and associations
const initializeApp = async () => {
  try {
    console.log("🚀 Initializing application...");
    
    // Create upload directories
    createUploadDirectories();
    console.log("✅ Upload directories ready");

    // Initialize database models
    await initializeModels();
    console.log("✅ Database models initialized");
    
    // Setup model associations
    setupAssociations();
    console.log("✅ Model associations configured");
    
    console.log("✅ Application initialized successfully");
    return true;
  } catch (error) {
    console.error("❌ Error initializing application:", error);
    console.error("❌ Full error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      parent: error.parent?.message,
      original: error.original?.message,
    });
    throw error;
  }
};

// Export the initialization promise
const appInitialized = initializeApp();

module.exports = { app, appInitialized };
