import { formatToClinicTime } from '../../lib/timezone';

interface BaseTemplateData {
  patientName: string;
}

const baseHtml = (content: string) => `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #f4f7f6; color: #333; }
  .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
  .header { background-color: #008080; color: #ffffff; padding: 20px; text-align: center; }
  .content { padding: 30px; line-height: 1.6; }
  .footer { background-color: #eeeeee; padding: 15px; text-align: center; font-size: 12px; color: #777; }
  .btn { display: inline-block; padding: 10px 20px; background-color: #008080; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Healthcare Clinic</h2>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Healthcare Clinic | 123 Health Ave, Medical City</p>
      <p>Please do not reply to this automated email.</p>
    </div>
  </div>
</body>
</html>
`;

export const bookingConfirmation = (data: { patientName: string, doctorName: string, datetime: Date | string, appointmentId: string }) => {
  const timeString = formatToClinicTime(data.datetime);
  return {
    subject: \`Appointment Confirmation - Healthcare Clinic\`,
    html: baseHtml(\`
      <p>Dear \${data.patientName},</p>
      <p>Your appointment has been successfully booked.</p>
      <p><strong>Doctor:</strong> \${data.doctorName}</p>
      <p><strong>Time:</strong> \${timeString}</p>
      <p><strong>Appointment ID:</strong> \${data.appointmentId}</p>
      <p>If you need to reschedule, please contact us or use the patient portal.</p>
    \`)
  };
};

export const appointmentReminder = (data: { patientName: string, doctorName: string, datetime: Date | string, hoursRemaining: number }) => {
  const timeString = formatToClinicTime(data.datetime);
  const urgency = data.hoursRemaining <= 1 ? "Urgent: " : "";
  return {
    subject: \`\${urgency}Appointment Reminder - Healthcare Clinic\`,
    html: baseHtml(\`
      <p>Dear \${data.patientName},</p>
      <p>This is a reminder for your upcoming appointment.</p>
      <p><strong>Doctor:</strong> \${data.doctorName}</p>
      <p><strong>Time:</strong> \${timeString}</p>
      <p>Please arrive 10 minutes early.</p>
    \`)
  };
};

export const cancellationNotice = (data: { patientName: string, cancelledBy: string, reason?: string, originalDatetime: Date | string }) => {
  const timeString = formatToClinicTime(data.originalDatetime);
  return {
    subject: \`Appointment Cancelled - Healthcare Clinic\`,
    html: baseHtml(\`
      <p>Dear \${data.patientName},</p>
      <p>Your appointment scheduled for \${timeString} has been cancelled by \${data.cancelledBy}.</p>
      \${data.reason ? \`<p><strong>Reason:</strong> \${data.reason}</p>\` : ''}
      <p>We apologize for any inconvenience. Please contact us to reschedule.</p>
    \`)
  };
};

export const reschedulingNotice = (data: { patientName: string, doctorName: string, oldDatetime: Date | string, newDatetime: Date | string }) => {
  const oldTimeString = formatToClinicTime(data.oldDatetime);
  const newTimeString = formatToClinicTime(data.newDatetime);
  return {
    subject: \`Appointment Rescheduled - Healthcare Clinic\`,
    html: baseHtml(\`
      <p>Dear \${data.patientName},</p>
      <p>Your appointment with \${data.doctorName} has been rescheduled.</p>
      <p><strong>Previous Time:</strong> <del>\${oldTimeString}</del></p>
      <p><strong>New Time:</strong> \${newTimeString}</p>
    \`)
  };
};

export const leaveConflictNotice = (data: { patientName: string, doctorName: string, leaveDate: Date | string, appointmentDatetime: Date | string }) => {
  const timeString = formatToClinicTime(data.appointmentDatetime);
  return {
    subject: \`Action Required: Appointment Rescheduling - Healthcare Clinic\`,
    html: baseHtml(\`
      <p>Dear \${data.patientName},</p>
      <p>Unfortunately, \${data.doctorName} will be on leave and unavailable for your scheduled appointment on \${timeString}.</p>
      <p>Please use our portal or contact us to reschedule your appointment at your earliest convenience.</p>
      <a href="#" class="btn">Reschedule Now</a>
    \`)
  };
};

export const medicationReminder = (data: { patientName: string, drugName: string, dose: string, frequency: string, timeToTake: string }) => {
  return {
    subject: \`Medication Reminder - Healthcare Clinic\`,
    html: baseHtml(\`
      <p>Dear \${data.patientName},</p>
      <p>This is a reminder to take your medication.</p>
      <p><strong>Medication:</strong> \${data.drugName}</p>
      <p><strong>Dose:</strong> \${data.dose}</p>
      <p><strong>Frequency:</strong> \${data.frequency}</p>
      <p><strong>Time to take:</strong> \${data.timeToTake}</p>
      <p>Please ensure you take your medication as prescribed.</p>
    \`)
  };
};
