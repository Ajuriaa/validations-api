import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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