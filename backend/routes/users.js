import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Client from '../models/Client.js';
import Deal from '../models/Deal.js';
import Sale from '../models/Sale.js';
import Meeting from '../models/Meeting.js';
import Schedule from '../models/Schedule.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import SecurityBlock from '../models/SecurityBlock.js';
import Performance from '../models/Performance.js';
import { sendEmail, generateOTP } from '../services/emailService.js';
import { tenantAuth, requireRole, addTenantFilter, addTenantData, checkUsageLimit } from '../middleware/tenantAuth.js';
import { logAction } from '../utils/auditLog.js';

const router = express.Router();

// Get all users (admin only, tenant-scoped)
router.get('/', tenantAuth, async (req, res) => {
  try {
    let query = addTenantFilter(req, {});

    if (req.user.role === 'agent') {
      query.role = 'agent';
    }

    // Tenant admins should only see agents and managers they registered (no superadmins, no other admins)
    if (req.user.role === 'admin') {
      query.role = { $in: ['agent', 'manager'] };
    }

    const users = await User.find(query)
      .select('-password -otp')
      .populate('tenant', 'name slug settings')
      .lean()
      .sort({ createdAt: -1 });

    const enrichedUsers = users.map(u => ({
      ...u,
      tenantLogo: u.tenantLogo || u.tenant?.settings?.logo || null,
    }));

    res.json({ users: enrichedUsers, total: enrichedUsers.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new user with OTP (admin/superadmin only, with usage limits)
router.post('/', tenantAuth, requireRole(['admin', 'manager', 'superadmin']), checkUsageLimit('users'), async (req, res) => {
  try {
    const {
      name, email, phone, role = 'agent', nin = null,
      employeeId = null, department = '', region = '',
    } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const existingUserQuery = req.isSuperAdmin
      ? { email }
      : { email, $or: [{ tenant: req.tenantId }, { tenant: null }] };

    const existingUser = await User.findOne(existingUserQuery);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const validRoles = ['manager', 'sales_manager', 'agent', 'sales_agent', 'salesagent'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified' });
    }

    const normalizedRole = String(role).toLowerCase().replace(/\s+/g, '_');
    const backendRole = normalizedRole === 'sales_manager' || normalizedRole === 'manager' ? 'manager' : 'agent';

    const otp = generateOTP();

    const userData = {
      name,
      email,
      phone,
      nin,
      password: otp,
      role: backendRole,
      isFirstLogin: true,
      otp: otp,
      otpExpires: new Date(Date.now() + 12 * 60 * 60 * 1000),
      ...(employeeId ? { customRole: null } : {}),
      department: department || '',
      region: region || '',
    };

    const userDataWithTenant = addTenantData(req, userData);

    const user = new User(userDataWithTenant);
    await user.save();

    if (req.tenantId) {
      await Tenant.findByIdAndUpdate(req.tenantId, {
        $inc: { 'usage.totalUsers': 1 },
        'usage.lastActivity': new Date()
      });
    }

    await logAction(req, 'CREATE_USER', `Created user ${email}`, { entityType: 'User', entityId: user._id });

    // Attempt to send email but DO NOT block user creation on email failure
    let emailResult = { success: false, error: 'Email sending skipped' };
    try {
      emailResult = await sendEmail(
        email,
        'agentWelcome',
        { name, email, otp, loginUrl: (process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:5173') + '/login' }
      );
    } catch (emailErr) {
      console.error('Email sending threw exception for ' + email + ':', emailErr.message);
      emailResult = { success: false, error: emailErr.message };
    }

    const userResponse = await User.findById(user._id)
      .select('-password -otp')
      .populate('tenant', 'name slug');

    // ALWAYS return the OTP so admin can manually share it if email fails
    const responseData = {
      message: emailResult.success
        ? 'User created successfully and welcome email sent'
        : 'User created successfully. Welcome email could not be sent. Share OTP manually.',
      user: userResponse,
      emailSent: emailResult.success,
      otp: otp,           // Always return OTP for admin to share
      error: emailResult.success ? undefined : (emailResult.error || 'Unknown email error'),
    };

    if (!emailResult.success) {
      console.log('Email failed for ' + email + '. OTP to share: ' + otp);
    }

    res.status(201).json(responseData);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Resend OTP (admin only, tenant-scoped)
router.post('/:id/resend-otp', tenantAuth, requireRole(['admin', 'manager', 'superadmin']), async (req, res) => {
  try {
    const query = addTenantFilter(req, { _id: req.params.id });
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newOTP = generateOTP();

    user.password = newOTP;
    user.otp = newOTP;
    user.otpExpires = new Date(Date.now() + 12 * 60 * 60 * 1000);
    user.isFirstLogin = true;

    await user.save();

    const emailResult = await sendEmail(
      user.email,
      'agentWelcome',
      { name: user.name, email: user.email, otp: newOTP }
    );

    res.json({
      message: 'OTP resent successfully',
      emailSent: emailResult.success,
      otp: newOTP
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user profile (admin only, tenant-scoped)
router.put('/:id', tenantAuth, requireRole(['admin', 'manager', 'superadmin']), async (req, res) => {
  try {
    const { name, phone, profileImage, nin, isActive, status } = req.body;

    const update = {};
    if (typeof name !== 'undefined') update.name = name;
    if (typeof phone !== 'undefined') update.phone = phone;
    if (typeof profileImage !== 'undefined') update.profileImage = profileImage;
    if (typeof nin !== 'undefined') update.nin = nin;
    if (typeof isActive !== 'undefined') {
      update.isActive = isActive;
      // if admin deactivates the account, ensure status becomes offline immediately
      if (isActive === false) update.status = 'offline';
    }
    if (typeof status !== 'undefined') update.status = status;

    // Find and update user with tenant filtering
    const query = addTenantFilter(req, { _id: req.params.id });
    const user = await User.findOneAndUpdate(
      query,
      update,
      { new: true, runValidators: true }
    ).select('-password -otp').populate('tenant', 'name slug');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user (admin only, tenant-scoped)
router.delete('/:id', tenantAuth, requireRole(['admin', 'manager', 'superadmin']), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find target user (allow superadmin to see all, others tenant-scoped)
    const targetQuery = req.isSuperAdmin
      ? { _id: req.params.id }
      : addTenantFilter(req, { _id: req.params.id });

    const user = await User.findOne(targetQuery).session(session);

    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'User not found' });
    }

    // Authorization check: who can delete whom?
    if (req.isSuperAdmin) {
      // Superadmin can delete anyone except themselves (optional safety) and other superadmins (protect platform)
      if (user._id.equals(req.user.userId)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ message: 'You cannot delete your own account' });
      }
      if (user.role === 'superadmin') {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ message: 'Superadmin accounts cannot be deleted' });
      }
      // Superadmin can delete admins, managers, agents freely
    } else if (req.user.role === 'admin') {
      // Admins can delete agents and managers within their tenant (but not other admins or superadmins)
      if (user.role !== 'agent' && user.role !== 'manager') {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ message: 'Admins can only delete agent and manager accounts' });
      }
      // Also ensure user is in same tenant (already enforced by query, but double-check)
      if (user.tenant && !user.tenant.equals(req.tenantId)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ message: 'Cannot delete users from other organizations' });
      }
    } else if (req.user.role === 'manager') {
      // Managers can delete agents for safety
      if (user.role !== 'agent') {
        await session.abortTransaction();
        session.endSession();
        return res.status(403).json({ message: 'Managers can only delete agent accounts' });
      }
    }

    // Use the tenant from the user for cleanup (handles superadmin deleting across tenants)
    const tenantId = user.tenant;

    // Actually delete the user
    const deletedUser = await User.findOneAndDelete(
      { _id: user._id },
      { session }
    );
    if (!deletedUser) {
      throw new Error('Failed to delete user record');
    }

    // Clean up all user's related data within the tenant

    // 1. Remove user from client assignedAgents arrays and reassign agent field if needed
    const clientsHandledByUser = await Client.find({
      tenant: tenantId,
      $or: [
        { agent: user._id },
        { assignedAgents: user._id }
      ]
    }).session(session);

    for (const client of clientsHandledByUser) {
      try {
        const updates = {};
        if (client.agent && client.agent.equals(user._id)) {
          // Reassign primary agent to another active user from same tenant (any role)
          const alternativeAgentForClient = await User.findOne({
            tenant: tenantId,
            isActive: true,
            _id: { $ne: user._id }
          }).session(session);
          if (alternativeAgentForClient) {
            updates.agent = alternativeAgentForClient._id;
          }
          // If no alternative agent, leave as-is to avoid required constraint violation
        }
        if (client.assignedAgents && client.assignedAgents.some(id => id.equals(user._id))) {
          updates.$pull = { assignedAgents: user._id };
        }
        if (Object.keys(updates).length > 0) {
          await Client.findByIdAndUpdate(client._id, updates).session(session);
        }
} catch {
         // Continue with other clients
       }
    }

    // 2. Reassign user's deals to another agent (any active user)
    const alternativeAgent = await User.findOne({
      tenant: tenantId,
      isActive: true,
      _id: { $ne: user._id }
    }).session(session);

    let userDeals = [];
    if (tenantId) {
      userDeals = await Deal.find({ agent: user._id, tenant: tenantId }).session(session);
      if (userDeals.length > 0 && alternativeAgent) {
        await Deal.updateMany(
          { agent: user._id, tenant: tenantId },
          {
            $set: { agent: alternativeAgent._id },
            $push: {
              notes: {
                content: `Deal reassigned from deleted user (${user.name}) to ${alternativeAgent.name}`,
                createdBy: null,
                createdAt: new Date()
              }
            }
          }
        ).session(session);
      } else if (userDeals.length > 0 && !alternativeAgent) {
        await Deal.deleteMany({ agent: user._id, tenant: tenantId }).session(session);
      }
    }

    // 3. Reassign user's sales to another agent
    try {
      if (alternativeAgent) {
        await Sale.updateMany(
          { agent: user._id, tenant: tenantId },
          { $set: { agent: alternativeAgent._id } }
        ).session(session);
      } else {
        await Sale.deleteMany({ agent: user._id, tenant: tenantId }).session(session);
      }
    } catch {
      // Continue; not critical
    }

    // 4. Remove user from deal teamMembers arrays
    try {
      await Deal.updateMany(
        { tenant: tenantId, teamMembers: user._id },
        { $pull: { teamMembers: user._id } }
      ).session(session);
    } catch {
      // Continue
    }

    // 5. Delete user's meetings
    await Meeting.deleteMany({ agent: user._id, tenant: tenantId }).session(session);

    // 6. Delete user's schedules
    await Schedule.deleteMany({ agent: user._id, tenant: tenantId }).session(session);

    // 7. Delete user's notifications
    try {
      await Notification.deleteMany({
        $or: [{ recipient: user._id }, { actor: user._id }],
        tenant: tenantId
      }).session(session);
    } catch {
      // Continue
    }

    // 8. Delete user's audit logs (cannot null required user field)
    try {
      await AuditLog.deleteMany({ user: user._id, tenant: tenantId }).session(session);
    } catch {
      // Continue
    }

    // 9. Deactivate user's security blocks
    try {
      await SecurityBlock.updateMany(
        { createdBy: user._id, tenant: tenantId },
        { $set: { isActive: false } }
      ).session(session);
    } catch {
      // Continue
    }

    // 10. Delete user's performance records
    await Performance.deleteMany({ agent: user._id, tenant: tenantId }).session(session);

    // 10. Update tenant usage count if user belongs to a tenant
    if (tenantId) {
      await Tenant.findByIdAndUpdate(tenantId, {
        $inc: { 'usage.totalUsers': -1 },
        'usage.lastActivity': new Date()
      }).session(session);
    }

    await logAction(req, 'DELETE_USER', `Deleted user ${user.email}`, {
      entityType: 'User',
      entityId: user._id,
      reassignedDeals: userDeals.length,
      reassignedTo: alternativeAgent ? alternativeAgent.email : null
    });

    await session.commitTransaction();
    session.endSession();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Set user targets (manager/superadmin only, tenant-scoped for manager)
router.put('/:userId/targets', tenantAuth, requireRole(['admin', 'superadmin', 'manager']), async (req, res) => {
   try {
     const { userId } = req.params;
     const { monthlyTargetDeals, monthlyTargetAmount, monthlyTargetClients } = req.body;

     // Find user with tenant filtering
     const query = req.isSuperAdmin
       ? { _id: userId }
       : { _id: userId, tenant: req.tenantId };

     const user = await User.findOne(query);

     if (!user) {
       return res.status(404).json({ message: 'User not found' });
     }

     // Update targets
     const updateData = {};
     if (typeof monthlyTargetDeals !== 'undefined') {
       updateData.monthlyTargetDeals = monthlyTargetDeals;
     }
     if (typeof monthlyTargetAmount !== 'undefined') {
       updateData.monthlyTargetAmount = monthlyTargetAmount;
     }
     if (typeof monthlyTargetClients !== 'undefined') {
       updateData.monthlyTargetClients = monthlyTargetClients;
     }

     // Prevent managers from setting targets for other managers or admins
     if (req.user.role === 'manager' && ['admin', 'manager'].includes(user.role)) {
       return res.status(403).json({
         message: 'Managers can only set targets for sales agents'
       });
     }

     // Update user
     const updatedUser = await User.findByIdAndUpdate(
       userId,
       updateData,
       { new: true }
     ).select('-password -otp');

     // Log the action
     await logAction(req, 'SET_TARGETS', `Set targets for user ${user.email}`, {
       entityType: 'User',
       entityId: user._id,
       targets: updateData
     });

      res.json({
        message: 'Targets updated successfully',
        user: updatedUser
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
 });


export { router as userRoutes };
