import { PrismaClient } from "@prisma/client";
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface CreateVehicleInput {
  unitRegister: string;
  licensePlate: string;
  routeId: number;
}

interface UpdateVehicleInput {
  unitRegister?: string;
  licensePlate?: string;
}

export async function createVehicle(vehicleData: CreateVehicleInput) {
  try {
    // Verify that the route exists
    const routeExists = await prisma.route.findUnique({
      where: { id: vehicleData.routeId }
    });

    if (!routeExists) {
      throw new Error(`Route with ID ${vehicleData.routeId} not found`);
    }

    // Create the vehicle
    const data = await prisma.vehicle.create({
      data: {
        unitRegister: vehicleData.unitRegister,
        licensePlate: vehicleData.licensePlate,
        routeId: vehicleData.routeId,
        systemDate: new Date()
      },
      include: {
        route: true
      }
    });

    return data;
  } catch (error) {
    console.error('Error creating vehicle', error);
    throw error;
  }
}

export async function updateVehicle(id: number, vehicleData: UpdateVehicleInput) {
  try {
    // Verify that the vehicle exists
    const vehicleExists = await prisma.vehicle.findUnique({
      where: { id }
    });

    if (!vehicleExists) {
      throw new Error(`Vehicle with ID ${id} not found`);
    }

    // Only allow updates to licensePlate and unitRegister
    const updateData: UpdateVehicleInput = {};

    if (vehicleData.licensePlate) {
      updateData.licensePlate = vehicleData.licensePlate;
    }

    if (vehicleData.unitRegister) {
      updateData.unitRegister = vehicleData.unitRegister;
    }

    // Update the vehicle
    const data = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        route: true
      }
    });

    return data;
  } catch (error) {
    console.error('Error updating vehicle', error);
    throw error;
  }
}

interface CreateValidationInput {
  numero_registro: string;
  base64FileFoto?: string;
  latitude?: number;
  longitude?: number;
}

export async function createValidation(validationData: CreateValidationInput) {
  try {
    // Find the vehicle by its unit register
    const vehicle = await prisma.vehicle.findFirst({
      where: { unitRegister: validationData.numero_registro },
      include: { route: true }
    });

    if (!vehicle) {
      throw new Error(`Vehicle with unit register ${validationData.numero_registro} not found`);
    }

    // Create validation entry
    const validation = await prisma.validation.create({
      data: {
        vehicleId: vehicle.id,
        registrationTime: new Date(),
        latitude: validationData.latitude,
        longitude: validationData.longitude,
        systemDate: new Date(),
        systemUser: 'API'
      },
      include: { vehicle: { include: { route: true } } }
    });

    // Save image if provided
    if (validationData.base64FileFoto) {
      // Use the relative files path
      const filesDir = '../files';

      // Create directory if it doesn't exist
      if (!fs.existsSync(filesDir)) {
        fs.mkdirSync(filesDir, { recursive: true });
      }

      // Extract the image data and determine file extension
      const matches = validationData.base64FileFoto.match(/^data:image\/([A-Za-z]+);base64,(.+)$/);

      if (matches && matches.length === 3) {
        const extension = matches[1].toLowerCase();
        const imageData = matches[2];
        const filename = `${validation.id}.${extension}`;
        const filePath = path.join(filesDir, filename);

        // Write file
        fs.writeFileSync(filePath, Buffer.from(imageData, 'base64'));

        // Update validation with image URL
        const imageUrl = `https://satt.transporte.gob.hn:298/files/${filename}`;

        await prisma.validation.update({
          where: { id: validation.id },
          data: { imageUrl }
        });

        validation.imageUrl = imageUrl;
      }
    }

    return validation;
  } catch (error) {
    console.error('Error creating validation', error);
    throw error;
  }
}
