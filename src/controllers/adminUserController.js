const { AdminUser, Project, Inquiry, Document } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { Op } = require("sequelize");
const { sequelize } = require("../models");

// Create admin user
const createAdmin = async (req, res) => {
  try {
    const { full_name, email, password, phone, position, role } =
      req.body;

    // Check if admin already exists
    const existingAdmin = await AdminUser.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await AdminUser.create({
      full_name,
      email,
      password: hashedPassword,
      phone,
      position,
      role: role || "super-admin",
    });

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      data: {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({
      success: false,
      message: "Error creating admin",
      error: error.message,
    });
  }
};

// Login admin user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await AdminUser.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last login
    await admin.update({ lastLogin: new Date() });

    // Generate token
    const token = jwt.sign(
      { id: admin.id, email: admin.email, type: "admin", role: admin.role },
      config.jwtSecret,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        admin: {
          id: admin.id,
          full_name: admin.full_name,
          email: admin.email,
          role: admin.role,
          position: admin.position,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

// Get all admins
const getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search, sortBy = "createdAt", sortOrder = "DESC" } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const whereClause = {};

    if (role) {
      whereClause.role = role;
    }

    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { position: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await AdminUser.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ["password"] },
      limit: limitNum,
      offset: offset,
      order: [[sortBy, sortOrder]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(count / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admins",
      error: error.message,
    });
  }
};

// Get admin by ID
const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await AdminUser.findByPk(id, {
      attributes: { exclude: ["password"] },
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      data: admin,
    });
  } catch (error) {
    console.error("Error fetching admin:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admin",
      error: error.message,
    });
  }
};

// Update admin profile
const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, phone, position, profile_image } = req.body;

    const admin = await AdminUser.findByPk(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    await admin.update({
      full_name: full_name || admin.full_name,
      phone: phone || admin.phone,
      position: position || admin.position,
      profile_image: profile_image || admin.profile_image,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email,
        phone: admin.phone,
        position: admin.position,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
      error: error.message,
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const admin = await AdminUser.findByPk(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await admin.update({ password: hashedPassword });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Error changing password",
      error: error.message,
    });
  }
};

// Update admin role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const admin = await AdminUser.findByPk(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    await admin.update({ role });

    res.status(200).json({
      success: true,
      message: "Admin role updated successfully",
      data: {
        id: admin.id,
        full_name: admin.full_name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({
      success: false,
      message: "Error updating role",
      error: error.message,
    });
  }
};

// Toggle admin active status
const toggleActiveStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await AdminUser.findByPk(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    await admin.update({ isActive: !admin.isActive });

    res.status(200).json({
      success: true,
      message: `Admin ${admin.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        id: admin.id,
        full_name: admin.full_name,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    console.error("Error toggling active status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating status",
      error: error.message,
    });
  }
};

// Delete admin
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await AdminUser.findByPk(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    await admin.destroy();

    res.status(200).json({
      success: true,
      message: "Admin deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting admin",
      error: error.message,
    });
  }
};

// Get platform dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const totalAdmins = await AdminUser.count();
    const activeAdmins = await AdminUser.count({ where: { isActive: true } });
    
    const totalProjects = await Project.count();
    const projectsByStatus = await Project.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    const totalInquiries = await Inquiry.count();
    const inquiriesByCategory = await Inquiry.findAll({
      attributes: [
        "category",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["category"],
      raw: true,
    });

    const totalDocuments = await Document.count();

    // Get recent activities
    const recentProjects = await Project.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      attributes: ["id", "name", "status", "category", "createdAt"],
      include: [
        {
          model: AdminUser,
          as: "creator",
          attributes: ["full_name"],
        },
      ],
    });

    const recentInquiries = await Inquiry.findAll({
      limit: 5,
      order: [["createdAt", "DESC"]],
      attributes: ["id", "full_name", "email", "category", "createdAt"],
    });

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalAdmins,
          activeAdmins,
          totalProjects,
          totalInquiries,
          totalDocuments,
        },
        projectsByStatus,
        inquiriesByCategory,
        recentActivities: {
          recentProjects,
          recentInquiries,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard stats",
      error: error.message,
    });
  }
};

module.exports = {
  createAdmin,
  login,
  getAllAdmins,
  getAdminById,
  updateProfile,
  changePassword,
  updateRole,
  toggleActiveStatus,
  deleteAdmin,
  getDashboardStats,
};
