import express from 'express';
import Client from '../models/Client.js';
import { tenantAuth } from '../middleware/tenantAuth.js';
import { logAction } from '../utils/auditLog.js';

const router = express.Router();

// Apply tenant-aware middleware to all routes
router.use(tenantAuth);

// GET all contacts across all clients for the current tenant
router.get('/', async (req, res) => {
  try {
    let query = req.tenantQuery;
    if (req.user.role === 'agent') {
      query = { ...query, agent: req.user.userId };
    }

    const clients = await Client.find(query)
      .select('name company contacts')
      .populate('contacts.createdBy', 'name email');

    const allContacts = [];
    clients.forEach(client => {
      (client.contacts || []).forEach(contact => {
        allContacts.push({
          ...contact.toObject(),
          clientId: client._id,
          clientName: client.name,
          clientCompany: client.company,
        });
      });
    });

    res.json({ contacts: allContacts, total: allContacts.length });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create a new contact for a client
router.post('/', async (req, res) => {
  try {
    const { clientId, name, position, email, phone, birthday, reportingLine, isPrimary } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Contact name is required' });
    }

    let client;
    if (clientId) {
      client = await Client.findOne({ _id: clientId, ...req.tenantQuery });
    } else {
      // If no clientId, use the first client for this agent/tenant
      const query = req.user.role === 'agent'
        ? { ...req.tenantQuery, agent: req.user.userId }
        : req.tenantQuery;
      client = await Client.findOne(query);
    }

    if (!client) {
      return res.status(404).json({ message: 'Client not found. Please create a client first.' });
    }

    const contact = {
      name,
      position: position || '',
      email: email || '',
      phone: phone || '',
      birthday: birthday ? new Date(birthday) : null,
      reportingLine: reportingLine || '',
      isPrimary: isPrimary || false,
    };

    client.contacts.push(contact);
    await client.save();

    const savedContact = client.contacts[client.contacts.length - 1];

    await logAction(req, 'CREATE_CONTACT', `Created contact "${name}" for ${client.name}`, {
      entityType: 'Contact',
      entityId: savedContact._id,
    });

    res.status(201).json({
      ...savedContact.toObject(),
      clientId: client._id,
      clientName: client.name,
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH update a contact
router.patch('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { name, position, email, phone, birthday, reportingLine, isPrimary } = req.body;

    let query = req.tenantQuery;
    if (req.user.role === 'agent') {
      query = { ...query, agent: req.user.userId };
    }

    const client = await Client.findOne({ ...query, 'contacts._id': contactId });
    if (!client) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    const contact = client.contacts.id(contactId);
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (name !== undefined) contact.name = name;
    if (position !== undefined) contact.position = position;
    if (email !== undefined) contact.email = email;
    if (phone !== undefined) contact.phone = phone;
    if (birthday !== undefined) contact.birthday = birthday ? new Date(birthday) : null;
    if (reportingLine !== undefined) contact.reportingLine = reportingLine;
    if (isPrimary !== undefined) contact.isPrimary = isPrimary;

    await client.save();

    res.json({
      ...contact.toObject(),
      clientId: client._id,
      clientName: client.name,
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE a contact
router.delete('/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;

    let query = req.tenantQuery;
    if (req.user.role === 'agent') {
      query = { ...query, agent: req.user.userId };
    }

    const client = await Client.findOne({ ...query, 'contacts._id': contactId });
    if (!client) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    client.contacts.pull(contactId);
    await client.save();

    await logAction(req, 'DELETE_CONTACT', `Deleted contact from ${client.name}`, {
      entityType: 'Contact',
      entityId: contactId,
    });

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as contactRoutes };