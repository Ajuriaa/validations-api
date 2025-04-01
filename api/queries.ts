import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getValidations() {
  try {
    const data = await prisma.validation.findMany({
      include: { vehicle: { include: { route: true } } },
    });
    return data;
  } catch (error) {
    console.error('Error retrieving validations', error);
    throw error;
  }
}

export async function getVehicleByPlate(plate: string) {
  try {
    const data = await prisma.vehicle.findFirst({
      where: { licensePlate: plate },
      include: { route: true },
    });
    return data;
  } catch (error) {
    console.error('Error retrieving vehicle', error);
    throw error;
  }
}

export async function getVehicles() {
  try {
    const data = await prisma.vehicle.findMany({
      include: { route: true },
    });
    return data;
  } catch (error) {
    console.error('Error retrieving vehicles', error);
    throw error;
  }
}

export async function getRoutes() {
  try {
    const data = await prisma.route.findMany();
    return data;
  } catch (error) {
    console.error('Error retrieving routes', error);
    throw error;
  }
}