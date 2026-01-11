"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteService = exports.updateService = exports.createService = exports.getServiceById = exports.getServices = void 0;
const prisma_1 = require("../../generated/prisma");
const idGenerator_1 = require("../utils/idGenerator");
const prisma = new prisma_1.PrismaClient();
// Helper function to convert Decimal to number
const toNumber = (value) => {
    return parseFloat(value.toString());
};
// GET all services
const getServices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const services = yield prisma.services.findMany({
            include: {
                Customers: true,
                Users: true
            },
            orderBy: {
                id: 'desc'
            }
        });
        // Transform the data to match frontend interface
        const transformedServices = services.map(service => {
            var _a, _b, _c, _d;
            return ({
                id: service.id,
                service_number: `SRV-${service.id.toString().padStart(3, '0')}`,
                customer_name: ((_a = service.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'Walk-in Customer',
                customer_phone: ((_b = service.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
                customer_address: ((_c = service.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
                service_product_name: service.serviceProductName,
                service_description: service.serviceDescription,
                service_cost: toNumber(service.serviceCost),
                service_status: service.serviceStatus,
                assigned_technician: ((_d = service.Users) === null || _d === void 0 ? void 0 : _d.name) || 'Unassigned',
                date: new Date().toISOString().split('T')[0], // Using current date since no date field in schema
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        });
        res.json(transformedServices);
    }
    catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).json({ message: "Error retrieving services" });
    }
});
exports.getServices = getServices;
// GET single service by ID
const getServiceById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const service = yield prisma.services.findUnique({
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
            customer_name: ((_a = service.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'Walk-in Customer',
            customer_phone: ((_b = service.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            customer_address: ((_c = service.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
            service_product_name: service.serviceProductName,
            service_description: service.serviceDescription,
            service_cost: toNumber(service.serviceCost),
            service_status: service.serviceStatus,
            assigned_technician: ((_d = service.Users) === null || _d === void 0 ? void 0 : _d.name) || 'Unassigned',
            technician_id: service.user_id,
            customer_id: service.customer_id,
            date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        res.json(transformedService);
    }
    catch (error) {
        console.error("Error fetching service:", error);
        res.status(500).json({ message: "Error retrieving service" });
    }
});
exports.getServiceById = getServiceById;
// POST create new service
const createService = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { serviceProductName, serviceDescription, serviceCost, serviceStatus, customer_id, user_id } = req.body;
        // Validate required fields
        if (!serviceProductName || !serviceDescription || !serviceCost || !serviceStatus) {
            res.status(400).json({
                message: "Missing required fields: serviceProductName, serviceDescription, serviceCost, serviceStatus"
            });
            return;
        }
        // Create service
        const newService = yield prisma.services.create({
            data: {
                serviceNo: yield (0, idGenerator_1.generateId)('services', 'SRV'),
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
            customer_name: ((_a = newService.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'Walk-in Customer',
            customer_phone: ((_b = newService.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            customer_address: ((_c = newService.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
            service_product_name: newService.serviceProductName,
            service_description: newService.serviceDescription,
            service_cost: toNumber(newService.serviceCost),
            service_status: newService.serviceStatus,
            assigned_technician: ((_d = newService.Users) === null || _d === void 0 ? void 0 : _d.name) || 'Unassigned',
            technician_id: newService.user_id,
            customer_id: newService.customer_id,
            date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        res.status(201).json(transformedService);
    }
    catch (error) {
        console.error("Error creating service:", error);
        res.status(500).json({ message: "Error creating service" });
    }
});
exports.createService = createService;
// PUT update service
const updateService = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { id } = req.params;
        const { serviceProductName, serviceDescription, serviceCost, serviceStatus, customer_id, user_id } = req.body;
        const updatedService = yield prisma.services.update({
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
            customer_name: ((_a = updatedService.Customers) === null || _a === void 0 ? void 0 : _a.name) || 'Walk-in Customer',
            customer_phone: ((_b = updatedService.Customers) === null || _b === void 0 ? void 0 : _b.phone) || '',
            customer_address: ((_c = updatedService.Customers) === null || _c === void 0 ? void 0 : _c.address) || '',
            service_product_name: updatedService.serviceProductName,
            service_description: updatedService.serviceDescription,
            service_cost: toNumber(updatedService.serviceCost),
            service_status: updatedService.serviceStatus,
            assigned_technician: ((_d = updatedService.Users) === null || _d === void 0 ? void 0 : _d.name) || 'Unassigned',
            technician_id: updatedService.user_id,
            customer_id: updatedService.customer_id,
            date: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        res.json(transformedService);
    }
    catch (error) {
        console.error("Error updating service:", error);
        res.status(500).json({ message: "Error updating service" });
    }
});
exports.updateService = updateService;
// DELETE service
const deleteService = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.services.delete({
            where: { id: parseInt(id) }
        });
        res.json({ message: "Service deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting service:", error);
        res.status(500).json({ message: "Error deleting service" });
    }
});
exports.deleteService = deleteService;
