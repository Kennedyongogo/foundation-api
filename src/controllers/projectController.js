const { Project, AdminUser, sequelize } = require("../models");
const { Op } = require("sequelize");

// Create project
const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      county,
      subcounty,
      target_individual,
      status,
      assigned_to,
      start_date,
      end_date,
      longitude,
      latitude,
      progress,
    } = req.body;

    // created_by will be the authenticated admin user
    const created_by = req.user?.id;

    // Validate required fields
    if (!name || !description || !category || !county) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields (name, description, category, county)",
      });
    }

    // Create project
    const project = await Project.create({
      name,
      description,
      category,
      county,
      subcounty,
      target_individual,
      status: status || "pending",
      created_by,
      assigned_by: created_by,
      assigned_to,
      start_date,
      end_date,
      longitude,
      latitude,
      progress: progress || 0,
      update_images: [],
      progress_descriptions: [],
      updated_by: [],
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({
      success: false,
      message: "Error creating project",
      error: error.message,
    });
  }
};

// Get all projects with pagination and filters
const getAllProjects = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status,
      county,
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

    if (county) {
      whereClause.county = county;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { target_individual: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Project.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: AdminUser,
          as: "creator",
          attributes: ["id", "full_name", "email"],
        },
        {
          model: AdminUser,
          as: "assignee",
          attributes: ["id", "full_name", "email"],
        },
      ],
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
    console.error("Error fetching projects:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching projects",
      error: error.message,
    });
  }
};

// Get single project by ID
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id, {
      include: [
        {
          model: AdminUser,
          as: "creator",
          attributes: ["id", "full_name", "email", "phone"],
        },
        {
          model: AdminUser,
          as: "assigner",
          attributes: ["id", "full_name", "email"],
        },
        {
          model: AdminUser,
          as: "assignee",
          attributes: ["id", "full_name", "email", "phone"],
        },
      ],
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching project",
      error: error.message,
    });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      county,
      subcounty,
      target_individual,
      status,
      assigned_to,
      start_date,
      end_date,
      longitude,
      latitude,
      progress,
    } = req.body;

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Update project
    await project.update({
      name,
      description,
      category,
      county,
      subcounty,
      target_individual,
      status,
      assigned_to,
      start_date,
      end_date,
      longitude,
      latitude,
      progress,
    });

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({
      success: false,
      message: "Error updating project",
      error: error.message,
    });
  }
};

// Update project status with progress tracking
const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, progress, progress_description, image_path } = req.body;

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const updated_by_user_id = req.user?.id;

    // Prepare update data
    const updateData = { status };

    if (progress !== undefined) {
      updateData.progress = progress;
    }

    // Add to progress descriptions array
    if (progress_description) {
      const descriptions = project.progress_descriptions || [];
      descriptions.push({
        description: progress_description,
        timestamp: new Date(),
        updated_by: updated_by_user_id,
      });
      updateData.progress_descriptions = descriptions;
    }

    // Add to update images array
    if (image_path) {
      const images = project.update_images || [];
      images.push({
        path: image_path,
        timestamp: new Date(),
        updated_by: updated_by_user_id,
      });
      updateData.update_images = images;
    }

    // Add to updated_by array
    const updatedByList = project.updated_by || [];
    updatedByList.push({
      user_id: updated_by_user_id,
      timestamp: new Date(),
      action: `Status changed to ${status}`,
    });
    updateData.updated_by = updatedByList;

    // Update project
    await project.update(updateData);

    res.status(200).json({
      success: true,
      message: "Project status updated successfully",
      data: project,
    });
  } catch (error) {
    console.error("Error updating project status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating project status",
      error: error.message,
    });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    await project.destroy();

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting project",
      error: error.message,
    });
  }
};

// Get project statistics
const getProjectStats = async (req, res) => {
  try {
    const totalProjects = await Project.count();
    const projectsByStatus = await Project.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
    });

    const projectsByCategory = await Project.findAll({
      attributes: [
        "category",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["category"],
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalProjects,
        byStatus: projectsByStatus,
        byCategory: projectsByCategory,
      },
    });
  } catch (error) {
    console.error("Error fetching project stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching project statistics",
      error: error.message,
    });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  updateProjectStatus,
  deleteProject,
  getProjectStats,
};

