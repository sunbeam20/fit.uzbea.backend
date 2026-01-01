import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { generateId } from '../utils/idGenerator';

const prisma = new PrismaClient();

// Helper function to convert Decimal to number
const toNumber = (value: any): number => {
  return parseFloat(value.toString());
};

// GET all services
export const getServices = async (req: Request, res: Response) => {
  try {
    const services = await prisma.services.findMany({
      include: {
        Customers: true,
        Users: true
      },
      orderBy: {
        id: 'desc'
      }
    });

    // Transform the data to match frontend interface
    const transformedServices = services.map(service => ({
      id: service.id,
      service_number: `SRV-${service.id.toString().padStart(3, '0')}`,
      customer_name: service.Customers?.name || 'Walk-in Customer',
      customer_phone: service.Customers?.phone || '',
      customer_address: service.Customers?.address || '',
      service_product_name: service.serviceProductName,
      service_description: service.serviceDescription,
      service_cost: toNumber(service.serviceCost),
      service_status: service.serviceStatus,
      assigned_technician: service.Users?.name || 'Unassigned',
      date: new Date().toISOString().split('T')[0], // Using current date since no date field in schema
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    res.json(transformedServices);
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ message: "Error retrieving services" });
  }
};

// GET single service by ID
export const getServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await prisma.services.findUnique({
      where: { id: parseInt(id) },
      include: {
        Customers: true,
        Users: true
      }
    });

    if (!service) {
      res.status(404).json({ message: "Service not found" });
      return;
    }

    // Transform the data
    const transformedService = {
      id: service.id,
      service_number: `SRV-${service.id.toString().padStart(3, '0')}`,
      customer_name: service.Customers?.name || 'Walk-in Customer',
      customer_phone: service.Customers?.phone || '',
      customer_address: service.Customers?.address || '',
      service_product_name: service.serviceProductName,
      service_description: service.serviceDescription,
      service_cost: toNumber(service.serviceCost),
      service_status: service.serviceStatus,
      assigned_technician: service.Users?.name || 'Unassigned',
      technician_id: service.user_id,
      customer_id: service.customer_id,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json(transformedService);
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(500).json({ message: "Error retrieving service" });
  }
};

// POST create new service
export const createService = async (req: Request, res: Response) => {
  try {
    const { 
      serviceProductName,
      serviceDescription,
      serviceCost,
      serviceStatus,
      customer_id,
      user_id
    } = req.body;

    // Validate required fields
    if (!serviceProductName || !serviceDescription || !serviceCost || !serviceStatus) {
      res.status(400).json({ 
        message: "Missing required fields: serviceProductName, serviceDescription, serviceCost, serviceStatus" 
      });
      return;
    }

    // Create service
    const newService = await prisma.services.create({
      data: {
        serviceNo: await generateId('services', 'SRV'),
        serviceProductName,
        serviceDescription,
        serviceCost: parseFloat(serviceCost),
        serviceStatus,
        customer_id: customer_id ? parseInt(customer_id) : null,
        user_id: user_id ? parseInt(user_id) : null
      },
      include: {
        Customers: true,
        Users: true
      }
    });

    // Transform the response
    const transformedService = {
      id: newService.id,
      service_number: `SRV-${newService.id.toString().padStart(3, '0')}`,
      customer_name: newService.Customers?.name || 'Walk-in Customer',
      customer_phone: newService.Customers?.phone || '',
      customer_address: newService.Customers?.address || '',
      service_product_name: newService.serviceProductName,
      service_description: newService.serviceDescription,
      service_cost: toNumber(newService.serviceCost),
      service_status: newService.serviceStatus,
      assigned_technician: newService.Users?.name || 'Unassigned',
      technician_id: newService.user_id,
      customer_id: newService.customer_id,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.status(201).json(transformedService);
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(500).json({ message: "Error creating service" });
  }
};

// PUT update service
export const updateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      serviceProductName,
      serviceDescription,
      serviceCost,
      serviceStatus,
      customer_id,
      user_id
    } = req.body;

    const updatedService = await prisma.services.update({
      where: { id: parseInt(id) },
      data: {
        serviceProductName,
        serviceDescription,
        serviceCost: serviceCost ? parseFloat(serviceCost) : undefined,
        serviceStatus,
        customer_id: customer_id ? parseInt(customer_id) : null,
        user_id: user_id ? parseInt(user_id) : null
      },
      include: {
        Customers: true,
        Users: true
      }
    });

    // Transform the response
    const transformedService = {
      id: updatedService.id,
      service_number: `SRV-${updatedService.id.toString().padStart(3, '0')}`,
      customer_name: updatedService.Customers?.name || 'Walk-in Customer',
      customer_phone: updatedService.Customers?.phone || '',
      customer_address: updatedService.Customers?.address || '',
      service_product_name: updatedService.serviceProductName,
      service_description: updatedService.serviceDescription,
      service_cost: toNumber(updatedService.serviceCost),
      service_status: updatedService.serviceStatus,
      assigned_technician: updatedService.Users?.name || 'Unassigned',
      technician_id: updatedService.user_id,
      customer_id: updatedService.customer_id,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json(transformedService);
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(500).json({ message: "Error updating service" });
  }
};

// DELETE service
export const deleteService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.services.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(500).json({ message: "Error deleting service" });
  }
};