export const sendNotification = async (schedule, action) => {
  try {
    console.log(`📅 Schedule ${action}:`, {
      title: schedule.title,
      date: schedule.date,
      client: schedule.client?.name,
      type: schedule.type
    });
    
    // Simulate sending notifications
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
  
  console.log(`⏰ Reminder scheduled for ${reminderTime}:`, {
    title: schedule.title,
    type: reminder,
    client: schedule.client?.name
  });
};

const calculateReminderTime = (scheduleDate, reminder) => {
  const date = new Date(scheduleDate);
  const reminderMap = {
    '15min': 15 * 60 * 1000,
    '30min': 30 * 60 * 1000,
    '1hr': 60 * 60 * 1000,
    '2hr': 2 * 60 * 60 * 1000,
    '1day': 24 * 60 * 60 * 1000
  };
  
  return new Date(date.getTime() - (reminderMap[reminder] || 0));
};

export default {
  sendNotification,
  scheduleReminder
};