import { PrismaClient } from "@prisma/client";

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

export async function createValidation(validation: any) {
  try {
    const data = await prisma.validation.create({
      data: validation,
    });
    return data;
  } catch (error) {
    console.error('Error creating validation', error);
    throw error;
  }
}