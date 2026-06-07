import express from 'express';
import Client from '../models/Client.js';
import { tenantAuth } from '../middleware/tenantAuth.js';
import { logAction } from '../utils/auditLog.js';

const router = express.Router();

// Apply tenant-aware middleware to all routes
router.use(tenantAuth);

// GET all tasks across all clients for the current tenant
router.get('/', async (req, res) => {
  try {
    let query = req.tenantQuery;
    if (req.user.role === 'agent') {
      // Agents see tasks assigned to them
      query = { ...query, 'tasks.assignedTo': req.user.userId };
    }

    const clients = await Client.find(query)
      .select('name company tasks')
      .populate('tasks.assignedTo', 'name email')
      .populate('agent', 'name email');

    const allTasks = [];
    clients.forEach(client => {
      (client.tasks || []).forEach(task => {
        allTasks.push({
          ...task.toObject(),
          clientId: client._id,
          clientName: client.name,
          clientCompany: client.company,
        });
      });
    });

    // Sort by due date (most recent first)
    allTasks.sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate) : new Date(0);
      const dateB = b.dueDate ? new Date(b.dueDate) : new Date(0);
      return dateB - dateA;
    });

    res.json({ tasks: allTasks, total: allTasks.length });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST create a new task for a client
router.post('/', async (req, res) => {
  try {
    const { clientId, title, subject, description, dueDate, dueTime, priority, status, assignedTo, contactPerson } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    let client;
    if (clientId) {
      client = await Client.findOne({ _id: clientId, ...req.tenantQuery });
    } else {
      // If no clientId, try to find the first client for this agent/tenant
      const query = req.user.role === 'agent'
        ? { ...req.tenantQuery, agent: req.user.userId }
        : req.tenantQuery;
      client = await Client.findOne(query);
    }

    if (!client) {
      return res.status(404).json({ message: 'Client not found. Please create a client first.' });
    }

    const task = {
      title,
      subject: subject || 'Other',
      description: description || '',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      dueTime: dueTime || '',
      priority: priority || 'Medium',
      status: status || 'pending',
      assignedTo: assignedTo || req.user.userId,
      contactPerson: contactPerson || '',
      completed: false,
    };

    client.tasks.push(task);
    await client.save();

    const savedTask = client.tasks[client.tasks.length - 1];

    await logAction(req, 'CREATE_TASK', `Created task "${title}" for ${client.name}`, {
      entityType: 'Task',
      entityId: savedTask._id,
    });

    res.status(201).json({
      ...savedTask.toObject(),
      clientId: client._id,
      clientName: client.name,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PATCH update a task
router.patch('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, subject, description, dueDate, dueTime, priority, status, completed, assignedTo, contactPerson } = req.body;

    let query = req.tenantQuery;
    if (req.user.role === 'agent') {
      query = { ...query, 'tasks.assignedTo': req.user.userId };
    }

    const client = await Client.findOne({ ...query, 'tasks._id': taskId });
    if (!client) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const task = client.tasks.id(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (title !== undefined) task.title = title;
    if (subject !== undefined) task.subject = subject;
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (dueTime !== undefined) task.dueTime = dueTime;
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (completed !== undefined) task.completed = completed;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (contactPerson !== undefined) task.contactPerson = contactPerson;

    await client.save();

    res.json({
      ...task.toObject(),
      clientId: client._id,
      clientName: client.name,
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE a task
router.delete('/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;

    let query = req.tenantQuery;
    if (req.user.role === 'agent') {
      query = { ...query, 'tasks.assignedTo': req.user.userId };
    }

    const client = await Client.findOne({ ...query, 'tasks._id': taskId });
    if (!client) {
      return res.status(404).json({ message: 'Task not found' });
    }

    client.tasks.pull(taskId);
    await client.save();

    await logAction(req, 'DELETE_TASK', `Deleted task from ${client.name}`, {
      entityType: 'Task',
      entityId: taskId,
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export { router as taskRoutes };