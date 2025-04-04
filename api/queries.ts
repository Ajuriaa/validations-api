import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ValidationQueryParams {
  page?: string;
  itemsPerPage?: string;
  startDate?: string;
  endDate?: string;
  [key: string]: string | undefined;
}

export async function getValidations(params: any) {
  try {
    // Parse pagination parameters
    const currentPage = params.page ? parseInt(params.page) : 1;
    const itemsPerPage = params.itemsPerPage ? parseInt(params.itemsPerPage) : 10;

    // Calculate pagination values
    const skip = (currentPage - 1) * itemsPerPage;
    const take = itemsPerPage;

    // Parse and validate dates
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (params.startDate) {
      startDate = new Date(params.startDate);
      if (isNaN(startDate.getTime())) {
        throw new Error('Invalid startDate format. Use ISO format (YYYY-MM-DD)');
      }
    }

    if (params.endDate) {
      endDate = new Date(params.endDate);
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid endDate format. Use ISO format (YYYY-MM-DD)');
      }
    }

    // Build where clause for date filtering
    const where: any = {};
    if (startDate || endDate) {
      where.systemDate = {};

      if (startDate) {
        where.systemDate.gte = startDate;
      }

      if (endDate) {
        where.systemDate.lte = endDate;
      }
    }

    // Get paginated validations
    const data = await prisma.validation.findMany({
      where,
      skip,
      take,
      include: { vehicle: { include: { route: true } } },
      orderBy: { systemDate: 'desc' }
    });

    // Get total count for pagination info
    const totalCount = await prisma.validation.count({ where });

    // Log pagination data for debugging
    console.log('Data length:', data.length);
    console.log('Total count:', totalCount);
    console.log('Skip:', skip, 'Take:', take);

    return {
      data,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage)
      }
    };
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

export async function getVehicles(params: any = {}) {
  try {
    // Parse pagination parameters
    const currentPage = params.page ? parseInt(params.page) : 1;
    const itemsPerPage = params.itemsPerPage ? parseInt(params.itemsPerPage) : 10;

    // Calculate pagination values
    const skip = (currentPage - 1) * itemsPerPage;
    const take = itemsPerPage;

    // Build where clause for filtering
    const where: any = {};

    if (params.plate) {
      where.licensePlate = params.plate;
    }

    if (params.unitRegister) {
      where.unitRegister = params.unitRegister;
    }

    if (params.routeId) {
      where.routeId = parseInt(params.routeId);
    }

    if (params.search) {
      where.OR = [
        { licensePlate: { contains: params.search } },
        { unitRegister: { contains: params.search } },
        { route: { name: { contains: params.search } } },
        { route: { code: { contains: params.search } } }
      ];
    }

    // Get paginated vehicles
    const data = await prisma.vehicle.findMany({
      where,
      skip,
      take,
      include: { route: true },
      orderBy: { unitRegister: 'asc' }
    });

    // Get total count for pagination info
    const totalCount = await prisma.vehicle.count({ where });

    return {
      data,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage)
      }
    };
  } catch (error) {
    console.error('Error retrieving vehicles', error);
    throw error;
  }
}

interface RouteQueryParams {
  page?: string;
  itemsPerPage?: string;
  search?: string;
  [key: string]: string | undefined;
}

export async function getRoutes(params: any = {}) {
  try {
    console.log('Received route params:', params);

    // Parse pagination parameters
    const currentPage = params.page ? parseInt(params.page) : 1;
    const itemsPerPage = params.itemsPerPage ? parseInt(params.itemsPerPage) : 10;

    // Calculate pagination values
    const skip = (currentPage - 1) * itemsPerPage;
    const take = itemsPerPage;

    // Build where clause for search filtering
    const where: any = {};
    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { code: { contains: params.search } }
      ];
    }

    // Get paginated routes
    const data = await prisma.route.findMany({
      where,
      skip,
      take,
      include: { vehicles: true },
      orderBy: { name: 'asc' }
    });

    // Get total count for pagination info
    const totalCount = await prisma.route.count({ where });

    return {
      data,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage)
      }
    };
  } catch (error) {
    console.error('Error retrieving routes', error);
    throw error;
  }
}