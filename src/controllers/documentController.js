const { Document, AdminUser, sequelize } = require("../models");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs").promises;

// Create/Upload document
const createDocument = async (req, res) => {
  try {
    const { title, description, file_type } = req.body;

    // Validate required fields
    if (!title || !file_type) {
      return res.status(400).json({
        success: false,
        message: "Please provide title and file type",
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    const uploaded_by = req.user?.id;
    const file_path = req.file.path;

    // Create document record
    const document = await Document.create({
      title,
      description,
      file_path,
      file_type,
      uploaded_by,
    });

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: document,
    });
  } catch (error) {
    console.error("Error creating document:", error);
    res.status(500).json({
      success: false,
      message: "Error uploading document",
      error: error.message,
    });
  }
};

// Get all documents with pagination and filters
const getAllDocuments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      file_type,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filter conditions
    const whereClause = {};

    if (file_type) {
      whereClause.file_type = file_type;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Document.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: AdminUser,
          as: "uploader",
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
    console.error("Error fetching documents:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching documents",
      error: error.message,
    });
  }
};

// Get single document by ID
const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      include: [
        {
          model: AdminUser,
          as: "uploader",
          attributes: ["id", "full_name", "email", "phone"],
        },
      ],
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching document",
      error: error.message,
    });
  }
};

// Update document details
const updateDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, file_type } = req.body;

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Update document
    await document.update({
      title: title || document.title,
      description: description !== undefined ? description : document.description,
      file_type: file_type || document.file_type,
    });

    res.status(200).json({
      success: true,
      message: "Document updated successfully",
      data: document,
    });
  } catch (error) {
    console.error("Error updating document:", error);
    res.status(500).json({
      success: false,
      message: "Error updating document",
      error: error.message,
    });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Delete file from storage
    try {
      await fs.unlink(document.file_path);
    } catch (fileError) {
      console.error("Error deleting file:", fileError);
      // Continue even if file deletion fails
    }

    // Delete database record
    await document.destroy();

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting document",
      error: error.message,
    });
  }
};

// Download document
const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Check if file exists
    try {
      await fs.access(document.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      });
    }

    // Send file
    res.download(document.file_path, path.basename(document.file_path));
  } catch (error) {
    console.error("Error downloading document:", error);
    res.status(500).json({
      success: false,
      message: "Error downloading document",
      error: error.message,
    });
  }
};

// Get document statistics
const getDocumentStats = async (req, res) => {
  try {
    const totalDocuments = await Document.count();
    
    const documentsByType = await Document.findAll({
      attributes: [
        "file_type",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["file_type"],
    });

    res.status(200).json({
      success: true,
      data: {
        total: totalDocuments,
        byType: documentsByType,
      },
    });
  } catch (error) {
    console.error("Error fetching document stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching document statistics",
      error: error.message,
    });
  }
};

module.exports = {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  downloadDocument,
  getDocumentStats,
};

