import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const createNotification = async (data) => {
  try {
    const { type, actorId, entityType, entityId, metadata = {} } = data;

    // Find all admin users
    const admins = await User.find({ role: 'admin' });
    console.log(`Found ${admins.length} admin users for notification`);

    if (admins.length === 0) {
      console.warn('No admin users found to send notifications');
      return;
    }

    // Get actor details
    const actor = await User.findById(actorId);
    if (!actor) {
      console.error('Actor not found for notification');
      return;
    }

    // Create notification messages based on type
    const notificationData = getNotificationData(type, actor, metadata);

    // Create notifications for all admins
    const notifications = admins.map(admin => ({
      title: notificationData.title,
      message: notificationData.message,
      type: type,
      recipient: admin._id,
      actor: actorId,
      entityType: entityType,
      entityId: entityId,
      metadata: metadata,
      priority: notificationData.priority || 'medium'
    }));

    await Notification.insertMany(notifications);
    console.log(`Created ${notifications.length} notifications of type '${type}' for admins`);

    return { success: true, count: notifications.length };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { success: false, error: error.message };
  }
};

const getNotificationData = (type, actor, metadata) => {
  const actorName = actor.name || 'Unknown Agent';

  switch (type) {
    case 'deal_created':
      return {
        title: 'New Deal Created',
        message: `${actorName} created a new deal: "${metadata.dealTitle || 'Untitled'}" worth UGX ${Number(metadata.value || 0).toLocaleString('en-UG')}`,
        priority: 'medium'
      };

    case 'deal_updated':
      return {
        title: 'Deal Updated',
        message: `${actorName} updated deal "${metadata.dealTitle || 'Untitled'}" - ${metadata.change || 'Modified details'}`,
        priority: 'low'
      };

    case 'deal_won':
      return {
        title: 'Deal Won! 🎉',
        message: `${actorName} closed a deal: "${metadata.dealTitle || 'Untitled'}" worth UGX ${Number(metadata.value || 0).toLocaleString('en-UG')}`,
        priority: 'high'
      };

    case 'deal_lost':
      return {
        title: 'Deal Lost',
        message: `${actorName} lost a deal: "${metadata.dealTitle || 'Untitled'}" worth UGX ${Number(metadata.value || 0).toLocaleString('en-UG')}`,
        priority: 'medium'
      };

    case 'client_created':
      return {
        title: 'New Client Added',
        message: `${actorName} registered a new client: ${metadata.clientName || 'Unknown Client'}`,
        priority: 'medium'
      };

    case 'client_updated':
      return {
        title: 'Client Updated',
        message: `${actorName} updated client information for ${metadata.clientName || 'Unknown Client'}`,
        priority: 'low'
      };

    case 'meeting_created':
      return {
        title: 'Meeting Scheduled',
        message: `${actorName} scheduled a meeting with ${metadata.clientName || 'client'} on ${metadata.date || 'TBD'}`,
        priority: 'medium'
      };

    case 'meeting_response':
      const responseText = metadata.response === 'accepted' ? 'accepted' :
                          metadata.response === 'declined' ? 'declined' :
                          'responded tentatively to';
      return {
        title: 'Meeting Response',
        message: `${metadata.clientName} has ${responseText} the meeting: "${metadata.meetingTitle}"`,
        priority: 'medium'
      };

    case 'sale_created':
      return {
        title: 'New Sale Recorded',
        message: `${actorName} recorded a new sale for ${metadata.customerName || 'Unknown Customer'} worth UGX ${Number(metadata.finalAmount || 0).toLocaleString('en-UG')}`,
        priority: 'high'
      };

    default:
      return {
        title: 'Agent Activity',
        message: `${actorName} performed an action: ${type}`,
        priority: 'low'
      };
  }
};

export const sendNotification = async (schedule, action) => {
  try {
    // Create notification for the schedule action
    await createNotification({
      type: 'meeting_scheduled',
      actorId: schedule.agent?._id || schedule.agent,
      entityType: 'Schedule',
      entityId: schedule._id,
      metadata: {
        meetingTitle: schedule.title,
        date: schedule.date,
        clientName: schedule.client?.name,
        meetingType: schedule.type
      }
    });

    // Handle reminders if any
    if (action === 'created' && schedule.reminders && schedule.reminders.length > 0) {
      schedule.reminders.forEach(reminder => {
        scheduleReminder(schedule, reminder);
      });
    }

    return { success: true, message: `Notification sent for schedule ${action}` };
  } catch (error) {
    console.error('Error sending notification:', error);
    return { success: false, error: error.message };
  }
};

const scheduleReminder = (schedule, reminder) => {
  const reminderTime = calculateReminderTime(schedule.date, reminder);

  // Schedule the reminder notification
  setTimeout(async () => {
    try {
      await createNotification({
        type: 'meeting_reminder',
        actorId: schedule.agent?._id || schedule.agent,
        entityType: 'Schedule',
        entityId: schedule._id,
        metadata: {
          meetingTitle: schedule.title,
          reminderTime: reminder,
          clientName: schedule.client?.name
        }
      });
    } catch (error) {
      console.error('Error sending reminder notification:', error);
    }
  }, reminderTime - Date.now());
};

const calculateReminderTime = (meetingDate, reminder) => {
  const meetingTime = new Date(meetingDate).getTime();
  const reminderMs = reminder * 60 * 1000; // Convert minutes to milliseconds
  return meetingTime - reminderMs;
};

export default {
  createNotification,
  sendNotification,
  scheduleReminder
};