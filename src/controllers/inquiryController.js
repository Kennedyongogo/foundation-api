const { Inquiry, sequelize } = require("../models");
const { Op } = require("sequelize");

// Create inquiry
const createInquiry = async (req, res) => {
  try {
    const { full_name, email, phone, message, category } = req.body;

    // Validate required fields
    if (!full_name || !email || !message || !category) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Create inquiry
    const inquiry = await Inquiry.create({
      full_name,
      email,
      phone,
      message,
      category,
    });

    res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: inquiry,
    });
  } catch (error) {
    console.error("Error creating inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting inquiry",
      error: error.message,
    });
  }
};

// Get all inquiries with pagination and filters
const getAllInquiries = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filter conditions
    const whereClause = {};

    if (category) {
      whereClause.category = category;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Inquiry.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inquiries",
      error: error.message,
    });
  }
};

// Get single inquiry by ID
const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findByPk(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.status(200).json({
      success: true,
      data: inquiry,
    });
  } catch (error) {
    console.error("Error fetching inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inquiry",
      error: error.message,
    });
  }
};

// Update inquiry status
const updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, description_update } = req.body;

    const inquiry = await Inquiry.findByPk(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    const updated_by_user_id = req.user?.id;

    // Prepare update data
    const updateData = { status };

    // Add to description updates array
    if (description_update) {
      const descriptions = inquiry.description_updates || [];
      descriptions.push({
        description: description_update,
        timestamp: new Date(),
        updated_by: updated_by_user_id,
      });
      updateData.description_updates = descriptions;
    }

    // Add to updated_by array
    const updatedByList = inquiry.updated_by || [];
    updatedByList.push({
      user_id: updated_by_user_id,
      timestamp: new Date(),
      action: `Status changed to ${status}`,
    });
    updateData.updated_by = updatedByList;

    // Update inquiry
    await inquiry.update(updateData);

    res.status(200).json({
      success: true,
      message: "Inquiry status updated successfully",
      data: inquiry,
    });
  } catch (error) {
    console.error("Error updating inquiry status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating inquiry status",
      error: error.message,
    });
  }
};

// Add description update to inquiry
const addDescriptionUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        success: false,
        message: "Description is required",
      });
    }

    const inquiry = await Inquiry.findByPk(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    const updated_by_user_id = req.user?.id;

    // Add to description updates array
    const descriptions = inquiry.description_updates || [];
    descriptions.push({
      description,
      timestamp: new Date(),
      updated_by: updated_by_user_id,
    });

    // Add to updated_by array
    const updatedByList = inquiry.updated_by || [];
    updatedByList.push({
      user_id: updated_by_user_id,
      timestamp: new Date(),
      action: "Added description update",
    });

    // Update inquiry
    await inquiry.update({
      description_updates: descriptions,
      updated_by: updatedByList,
    });

    res.status(200).json({
      success: true,
      message: "Description update added successfully",
      data: inquiry,
    });
  } catch (error) {
    console.error("Error adding description update:", error);
    res.status(500).json({
      success: false,
      message: "Error adding description update",
      error: error.message,
    });
  }
};

// Delete inquiry
const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findByPk(id);

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    await inquiry.destroy();

    res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting inquiry",
      error: error.message,
    });
  }
};

// Get inquiry statistics by category and status
const getInquiryStats = async (req, res) => {
  try {
    const statsByCategory = await Inquiry.findAll({
      attributes: [
        "category",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["category"],
    });

    const statsByStatus = await Inquiry.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
    });

    const totalInquiries = await Inquiry.count();

    res.status(200).json({
      success: true,
      data: {
        total: totalInquiries,
        byCategory: statsByCategory,
        byStatus: statsByStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching inquiry stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching inquiry statistics",
      error: error.message,
    });
  }
};

module.exports = {
  createInquiry,
  getAllInquiries,
  getInquiryById,
  updateInquiryStatus,
  addDescriptionUpdate,
  deleteInquiry,
  getInquiryStats,
};

