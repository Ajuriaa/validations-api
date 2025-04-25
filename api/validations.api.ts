import express from 'express';
import { getRouteByCode, getRoutes, getValidations, getVehicles } from './queries';
import { createVehicle, createValidation, updateVehicle } from './mutations';
import ExcelJS from 'exceljs';

export const router = express.Router();

router.use((req, res, next) => {
  console.log('validation system middleware');
  next();
});

router.get('/validations', async (req, res) => {
  try {
    const data = await getValidations(req.query);
    res.json(data);
  } catch (error) {
    console.error('Error in validations route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/vehicles', async (req, res) => {
  try {
    const data = await getVehicles(req.query);
    res.json(data);
  } catch (error) {
    console.error('Error in vehicles route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/routes', async (req, res) => {
  try {
    const data = await getRoutes(req.query);
    res.json(data);
  } catch (error) {
    console.error('Error in routes route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/route/:code', async (req: any, res: any) => {
  try {
    const data = await getRouteByCode(req.params.code);
    if (!data) {
      return res.status(404).json({ error: 'Route not found' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error in route by code route:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mutations
router.post('/create-vehicle', async (req, res) => {
  try {
    const data = await createVehicle(req.body);
    res.json(data);
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

router.post('/update-vehicle', async (req, res) => {
  updateVehicle(req.body.id, req.body.data).then((data) => {
    res.json(data);
  });
});

router.post('/validation', async (req, res) => {
  try {
    const data = await createValidation(req.body);
    res.json(data);
  } catch (error) {
    console.error('Error creating validation:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    // Create a query object that doesn't include pagination
    const queryParams = { ...req.query };

    // Set a very large number for itemsPerPage to effectively get all records
    queryParams.itemsPerPage = '999999';
    queryParams.page = '1';

    // Get the data using the modified query parameters
    const data = await getValidations(queryParams);

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('REPORTE');

    // Add title
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'REPORTE DE VALIDACIONES';
    titleCell.font = {
      size: 16,
      bold: true
    };
    titleCell.alignment = { horizontal: 'center' };

    // Add parameters used for the report
    worksheet.mergeCells('A2:G2');
    let reportParams = 'Parámetros: ';
    if (req.query.date) reportParams += `Fecha: ${req.query.date}, `;
    if (req.query.search) reportParams += `Búsqueda: ${req.query.search}`;

    // Remove trailing comma if exists
    reportParams = reportParams.replace(/,\s*$/, '');

    const paramsCell = worksheet.getCell('A2');
    paramsCell.value = reportParams;
    paramsCell.font = {
      italic: true
    };

    // Add headers
    const headers = [
      'ID',
      'Placa',
      'Registro Unidad',
      'Ruta',
      'Fecha',
      'Hora',
      'Ubicación'
    ];

    worksheet.getRow(4).values = headers;
    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(4).alignment = { horizontal: 'center' };

    // Add data rows
    if (data.data && data.data.length > 0) {
      data.data.forEach((validation, index) => {
        const rowIndex = index + 5; // Start from row 5 (after headers)

        const formattedDate = validation.systemDate ?
          new Date(validation.systemDate).toLocaleDateString() : '';

        const formattedTime = validation.registrationTime ?
          validation.registrationTime : '';

        const location = validation.latitude && validation.longitude ?
          `${validation.latitude}, ${validation.longitude}` : 'N/A';

        worksheet.getRow(rowIndex).values = [
          validation.id,
          validation.vehicle?.licensePlate || 'N/A',
          validation.vehicle?.unitRegister || 'N/A',
          validation.vehicle?.route?.name || 'N/A',
          formattedDate,
          formattedTime,
          location
        ];
      });
    }

    // Auto-adjust column widths
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Add total count info at the bottom
    const totalRowIndex = data.data.length + 6;
    worksheet.mergeCells(`A${totalRowIndex}:G${totalRowIndex}`);
    const totalCell = worksheet.getCell(`A${totalRowIndex}`);
    totalCell.value = `Total: ${data.data.length} registros`;
    totalCell.font = { italic: true };

    // Set Content-Type and Content-Disposition for Excel file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Validaciones_${new Date().toISOString().split('T')[0]}.xlsx`);

    // Write the workbook to the response
    await workbook.xlsx.write(res);

    // End the response
    res.end();
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
});

