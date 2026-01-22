// app/api/tasks/reminders/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Task from "@/models/Task";

const techWebhookUrl = process.env.SLACK_WEBHOOK_URL;
const accountsWebhookUrl = process.env.SLACK_WEBHOOK_URL_ACC;

function getDateOnly(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function POST() {
  await connectDB();

  try {
    const today = getDateOnly(new Date());

    // ✅ Find tasks that have a due date and are not completed
    const tasks = await Task.find({
      dueDate: { $exists: true, $nin: [null, ""] },
      status: { $ne: "Completed" },
    });

    let reminderCount = 0;
    let overdueCount = 0;

    for (const task of tasks) {
      const { projectId, project, assigneeNames, dueDate, department, _id } = task;

      if (!dueDate) continue; // safety

      // dueDate stored as "YYYY-MM-DD"
      const due = getDateOnly(new Date(`${dueDate}T00:00:00`));
      const diffDays = Math.round(
        (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Decide Slack webhook based on department (fallback to tech)
      let webhookUrl: string | undefined = techWebhookUrl || undefined;
      if (department === "Accounts") {
        webhookUrl = accountsWebhookUrl || webhookUrl;
      }

      if (!webhookUrl) continue; // Skip if no webhook URL

      // Get assignee name(s) - use first one if array exists, otherwise empty string
      const assigneeText = assigneeNames && assigneeNames.length > 0 
        ? assigneeNames.join(", ") 
        : "Unassigned";

      // 1️⃣ Reminder: 2 days before due date
      // Since we don't have dueReminderSent field, we'll send reminder every time this runs
      // when task is 2 days before due date
      if (diffDays === 2 && webhookUrl) {
        const text =
          `⏰ *Reminder: Task due in 2 days*\n` +
          `• *ID:* ${projectId}\n` +
          `• *Project:* ${project}\n` +
          `• *Assignee(s):* ${assigneeText}\n` +
          `• *Due Date:* ${dueDate}`;

        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
          reminderCount++;
          
          // Optionally add a note that reminder was sent
          // You could add a 'lastReminderSent' field to track when reminder was sent
          await Task.findByIdAndUpdate(_id, {
            $set: { lastReminderSent: new Date() }
          }, { new: true });
          
        } catch (err) {
          console.error(
            `Failed to send reminder Slack for task ${projectId}`,
            err
          );
        }
      }

      // 2️⃣ Overdue alert: due date is in the past
      // Since we don't have overdueNotified field, we'll send alert every time this runs
      // when task is overdue (or could send once per day)
      if (diffDays < 0 && webhookUrl) {
        const text =
          `⚠️ *Overdue Task Alert*\n` +
          `• *ID:* ${projectId}\n` +
          `• *Project:* ${project}\n` +
          `• *Assignee(s):* ${assigneeText}\n` +
          `• *Due Date:* ${dueDate}\n` +
          `• Status: ${task.status}`;

        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
          overdueCount++;
          
          // Optionally add a note that overdue alert was sent
          await Task.findByIdAndUpdate(_id, {
            $set: { lastOverdueAlert: new Date() }
          }, { new: true });
          
        } catch (err) {
          console.error(
            `Failed to send overdue Slack for task ${projectId}`,
            err
          );
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Reminder job completed",
        remindersSent: reminderCount,
        overdueAlertsSent: overdueCount,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("🔥 Error running reminders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to run reminders." },
      { status: 500 }
    );
  }
}