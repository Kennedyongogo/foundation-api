const PDFDocument = require("pdfkit");
const { Document, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, HeadingLevel } = require("docx");
const { Packer } = require("docx");

/**
 * Generate PDF Report
 */
const generatePDFReport = async (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const chunks = [];

      // Collect PDF chunks
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Helper function to format date
      const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      };

      // Header
      doc
        .fontSize(24)
        .fillColor("#2196f3")
        .text("Activity Report", { align: "center" });

      doc.moveDown(0.5);

      // Date Range
      doc
        .fontSize(12)
        .fillColor("#666")
        .text(
          `Report Period: ${formatDate(reportData.dateRange.start)} - ${formatDate(reportData.dateRange.end)}`,
          { align: "center" }
        );

      doc
        .fontSize(10)
        .fillColor("#999")
        .text(`Generated on: ${formatDate(new Date())}`, { align: "center" });

      doc.moveDown(2);

      // Summary Section
      doc.fontSize(18).fillColor("#000").text("Executive Summary");
      doc.moveDown(0.5);

      // Draw summary boxes
      const summaryData = [
        {
          label: "Projects",
          value: reportData.summary.projects?.total || 0,
          color: "#4caf50",
        },
        {
          label: "Inquiries",
          value: reportData.summary.inquiries?.total || 0,
          color: "#2196f3",
        },
        {
          label: "Documents",
          value: reportData.summary.documents?.total || 0,
          color: "#ff9800",
        },
        {
          label: "Activities",
          value: reportData.summary.activities?.total || 0,
          color: "#e91e63",
        },
      ];

      const boxWidth = 120;
      const boxHeight = 60;
      const startX = 70;
      let currentX = startX;

      summaryData.forEach((item, index) => {
        doc
          .rect(currentX, doc.y, boxWidth, boxHeight)
          .fillAndStroke(item.color, "#000");

        doc
          .fontSize(24)
          .fillColor("#fff")
          .text(item.value.toString(), currentX, doc.y + 10, {
            width: boxWidth,
            align: "center",
          });

        doc
          .fontSize(10)
          .fillColor("#fff")
          .text(item.label, currentX, doc.y + 10, {
            width: boxWidth,
            align: "center",
          });

        currentX += boxWidth + 10;
      });

      doc.moveDown(6);

      // Projects Section
      if (reportData.projects && reportData.projects.length > 0) {
        addNewPageIfNeeded(doc, 100);
        
        doc.fontSize(16).fillColor("#000").text("Projects");
        doc.moveDown(0.5);

        // Projects by status
        if (reportData.summary.projects?.byStatus) {
          doc.fontSize(12).fillColor("#666").text("Status Breakdown:");
          reportData.summary.projects.byStatus.forEach((stat) => {
            doc
              .fontSize(10)
              .fillColor("#000")
              .text(`  • ${stat.status}: ${stat.count}`);
          });
          doc.moveDown(1);
        }

        // Project details
        doc.fontSize(12).fillColor("#666").text("Project Details:");
        doc.moveDown(0.5);

        reportData.projects.slice(0, 10).forEach((project, index) => {
          addNewPageIfNeeded(doc, 80);
          
          doc
            .fontSize(11)
            .fillColor("#2196f3")
            .text(`${index + 1}. ${project.name}`);
          doc
            .fontSize(9)
            .fillColor("#666")
            .text(`   Status: ${project.status}`, { continued: true })
            .text(` | Category: ${project.category}`);
          doc.text(`   County: ${project.county}`);
          if (project.creator) {
            doc.text(`   Created by: ${project.creator.full_name}`);
          }
          doc.moveDown(0.5);
        });

        if (reportData.projects.length > 10) {
          doc
            .fontSize(9)
            .fillColor("#999")
            .text(`... and ${reportData.projects.length - 10} more projects`);
        }

        doc.moveDown(1);
      }

      // Inquiries Section
      if (reportData.inquiries && reportData.inquiries.length > 0) {
        addNewPageIfNeeded(doc, 100);
        
        doc.fontSize(16).fillColor("#000").text("Inquiries");
        doc.moveDown(0.5);

        // Inquiries by status
        if (reportData.summary.inquiries?.byStatus) {
          doc.fontSize(12).fillColor("#666").text("Status Breakdown:");
          reportData.summary.inquiries.byStatus.forEach((stat) => {
            doc
              .fontSize(10)
              .fillColor("#000")
              .text(`  • ${stat.status}: ${stat.count}`);
          });
          doc.moveDown(1);
        }

        // Inquiry details
        doc.fontSize(12).fillColor("#666").text("Recent Inquiries:");
        doc.moveDown(0.5);

        reportData.inquiries.slice(0, 10).forEach((inquiry, index) => {
          addNewPageIfNeeded(doc, 70);
          
          doc
            .fontSize(11)
            .fillColor("#2196f3")
            .text(`${index + 1}. ${inquiry.full_name}`);
          doc
            .fontSize(9)
            .fillColor("#666")
            .text(`   Email: ${inquiry.email}`);
          doc.text(`   Category: ${inquiry.category} | Status: ${inquiry.status}`);
          doc.moveDown(0.5);
        });

        if (reportData.inquiries.length > 10) {
          doc
            .fontSize(9)
            .fillColor("#999")
            .text(`... and ${reportData.inquiries.length - 10} more inquiries`);
        }

        doc.moveDown(1);
      }

      // Documents Section
      if (reportData.documents && reportData.documents.length > 0) {
        addNewPageIfNeeded(doc, 80);
        
        doc.fontSize(16).fillColor("#000").text("Documents");
        doc.moveDown(0.5);

        doc
          .fontSize(12)
          .fillColor("#666")
          .text(`Total Documents Uploaded: ${reportData.documents.length}`);
        doc.moveDown(1);
      }

      // Activities Section
      if (reportData.activities && reportData.activities.length > 0) {
        addNewPageIfNeeded(doc, 100);
        
        doc.fontSize(16).fillColor("#000").text("Recent Activities");
        doc.moveDown(0.5);

        reportData.activities.slice(0, 15).forEach((activity, index) => {
          addNewPageIfNeeded(doc, 50);
          
          doc
            .fontSize(9)
            .fillColor("#000")
            .text(
              `${formatDate(activity.createdAt)} - ${activity.action}: ${activity.description}`
            );
          doc.moveDown(0.3);
        });

        if (reportData.activities.length > 15) {
          doc
            .fontSize(9)
            .fillColor("#999")
            .text(`... and ${reportData.activities.length - 15} more activities`);
        }
      }

      // Footer
      doc.moveDown(2);
      doc
        .fontSize(8)
        .fillColor("#999")
        .text("End of Report", { align: "center" });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to add new page if needed
const addNewPageIfNeeded = (doc, requiredSpace) => {
  const currentY = doc.y;
  const pageHeight = doc.page.height - doc.page.margins.bottom;
  
  if (currentY + requiredSpace > pageHeight) {
    doc.addPage();
  }
};

/**
 * Generate Word Report
 */
const generateWordReport = async (reportData) => {
  try {
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const children = [];

    // Title
    children.push(
      new Paragraph({
        text: "Activity Report",
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );

    // Date Range
    children.push(
      new Paragraph({
        text: `Report Period: ${formatDate(reportData.dateRange.start)} - ${formatDate(reportData.dateRange.end)}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    children.push(
      new Paragraph({
        text: `Generated on: ${formatDate(new Date())}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      })
    );

    // Executive Summary
    children.push(
      new Paragraph({
        text: "Executive Summary",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 200 },
      })
    );

    // Summary table
    const summaryTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Metric")] }),
            new TableCell({ children: [new Paragraph("Count")] }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Projects")] }),
            new TableCell({
              children: [
                new Paragraph((reportData.summary.projects?.total || 0).toString()),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Inquiries")] }),
            new TableCell({
              children: [
                new Paragraph((reportData.summary.inquiries?.total || 0).toString()),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Documents")] }),
            new TableCell({
              children: [
                new Paragraph((reportData.summary.documents?.total || 0).toString()),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph("Activities")] }),
            new TableCell({
              children: [
                new Paragraph((reportData.summary.activities?.total || 0).toString()),
              ],
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    children.push(summaryTable);
    children.push(new Paragraph({ text: "", spacing: { after: 400 } }));

    // Projects Section
    if (reportData.projects && reportData.projects.length > 0) {
      children.push(
        new Paragraph({
          text: "Projects",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        })
      );

      reportData.projects.slice(0, 20).forEach((project, index) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. ${project.name}`, bold: true }),
            ],
            spacing: { after: 100 },
          })
        );

        children.push(
          new Paragraph({
            text: `   Status: ${project.status} | Category: ${project.category}`,
            spacing: { after: 50 },
          })
        );

        children.push(
          new Paragraph({
            text: `   County: ${project.county}`,
            spacing: { after: 50 },
          })
        );

        if (project.creator) {
          children.push(
            new Paragraph({
              text: `   Created by: ${project.creator.full_name}`,
              spacing: { after: 200 },
            })
          );
        }
      });
    }

    // Inquiries Section
    if (reportData.inquiries && reportData.inquiries.length > 0) {
      children.push(
        new Paragraph({
          text: "Inquiries",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 200 },
        })
      );

      reportData.inquiries.slice(0, 20).forEach((inquiry, index) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${index + 1}. ${inquiry.full_name}`, bold: true }),
            ],
            spacing: { after: 100 },
          })
        );

        children.push(
          new Paragraph({
            text: `   Email: ${inquiry.email}`,
            spacing: { after: 50 },
          })
        );

        children.push(
          new Paragraph({
            text: `   Category: ${inquiry.category} | Status: ${inquiry.status}`,
            spacing: { after: 200 },
          })
        );
      });
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generatePDFReport,
  generateWordReport,
};

