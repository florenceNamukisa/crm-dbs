import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useSchedules, useCreateSchedule } from "@/lib/api/schedules";
import { useClients } from "@/lib/api/clients";
import { useUsers } from "@/lib/api/users";
import { getStoredUser } from "@/lib/auth";

export const Route = createFileRoute("/calendar")({
  component: SchedulesPage,
});

function SchedulesPage() {
  const { data: schedulesData, isLoading } = useSchedules();
  const { data: clientsData } = useClients();
  const { data: usersData } = useUsers();
  const createSchedule = useCreateSchedule();
  const allSchedules = schedulesData?.schedules ?? [];
  const clients = clientsData?.clients ?? [];
  const agents = (usersData?.users ?? []).filter((u: any) => 
    u.role === "agent" || u.role === "sales_agent" || u.role === "admin"
  );
  const user = getStoredUser();

  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [meetingMode, setMeetingMode] = useState("in-person");
  const [newSchedule, setNewSchedule] = useState({ 
    title: "", 
    date: "", 
    time: "", 
    duration: 60,
    location: "" 
  });

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyCells = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const prevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };
  const goToday = () => {
    setCurrentDate(new Date());
  };

  const getCombinedDateTime = () => {
    if (!newSchedule.date || !newSchedule.time) return null;
    const [year, month, day] = newSchedule.date.split("-").map(Number);
    const [hours, minutes] = newSchedule.time.split(":").map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  };

  async function addSchedule() {
    if (!newSchedule.title || !newSchedule.date) {
      toast.error("Please fill in title and date");
      return;
    }
    
    const combinedDateTime = getCombinedDateTime();
    if (!combinedDateTime) {
      toast.error("Invalid date/time combination");
      return;
    }

    // Use selected agent, or fallback to current user's ID
    const agentId = selectedAgent || (user as any)?.id || (user as any)?._id;
    if (!agentId) {
      toast.error("Please select an agent");
      return;
    }

    try {
      await createSchedule.mutateAsync({
        title: newSchedule.title,
        agent: agentId,
        client: selectedClient || null,
        date: combinedDateTime.toISOString(),
        duration: newSchedule.duration || 60,
        type: "meeting",
        mode: meetingMode,
        location: newSchedule.location || (meetingMode === "in-person" ? "Office" : null),
        status: "scheduled",
      });
      setNewSchedule({ title: "", date: "", time: "", duration: 60, location: "" });
      setSelectedClient("");
      setSelectedAgent("");
      setMeetingMode("in-person");
      setShowForm(false);
      toast.success("Schedule added");
    } catch (err: any) {
      toast.error("Failed to add schedule", { description: err.message });
    }
  }

  const getMonthSchedules = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return allSchedules.filter((s: any) => {
      const scheduleDate = s.date || s.scheduledTime;
      if (!scheduleDate) return false;
      return new Date(scheduleDate).toISOString().split("T")[0] === dateStr;
    });
  };

  const statusColors: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    rescheduled: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  };

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === currentYear && today.getMonth() === currentMonth;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Schedules</h1>
            <p className="text-sm text-muted-foreground">Manage your meetings and events</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="h-10 px-4 gradient-orange text-white rounded-lg flex items-center gap-2 font-medium shadow-lg hover:opacity-90"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Close" : "Schedule Meeting"}
          </button>
        </div>

        {/* Scheduling Form */}
        {showForm && (
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold text-lg">Schedule a Meeting</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  value={newSchedule.title}
                  onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                  placeholder="e.g. Discovery call"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">— No client —</option>
                  {clients.map((c: any) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Agent *</label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Select agent</option>
                  {agents.map((a: any) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mode</label>
                <select
                  value={meetingMode}
                  onChange={(e) => setMeetingMode(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="in-person">In-person</option>
                  <option value="google-meet">Google Meet</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  type="date"
                  value={newSchedule.date}
                  onChange={(e) => setNewSchedule({ ...newSchedule, date: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input
                  type="time"
                  value={newSchedule.time}
                  onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={newSchedule.duration}
                  onChange={(e) => setNewSchedule({ ...newSchedule, duration: parseInt(e.target.value) || 60 })}
                  min={1}
                  max={1440}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              {meetingMode === "in-person" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <input
                    value={newSchedule.location}
                    onChange={(e) => setNewSchedule({ ...newSchedule, location: e.target.value })}
                    placeholder="Office address or meeting room"
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={addSchedule}
                disabled={createSchedule.isPending}
                className="h-10 px-4 gradient-orange text-white rounded-lg text-sm font-medium shadow-lg hover:opacity-90 disabled:opacity-60"
              >
                {createSchedule.isPending ? "Saving..." : "Add to Schedule"}
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar with navigation */}
          <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                <h2 className="font-semibold text-lg">{monthName}</h2>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center transition"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToday}
                  className="h-8 px-3 rounded-lg border border-border hover:bg-accent text-xs font-medium transition"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="h-8 w-8 rounded-lg border border-border hover:bg-accent flex items-center justify-center transition"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
              ))}
              {emptyCells.map((i) => (
                <div key={"e-" + i} className="min-h-[80px] rounded-lg bg-muted/30"></div>
              ))}
              {calendarDays.map((day) => {
                const daySchedules = getMonthSchedules(day);
                const isToday = isCurrentMonth && day === today.getDate();
                return (
                  <div
                    key={day}
                    className={`min-h-[80px] rounded-lg border p-1 text-sm transition ${
                      isToday ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10" : "border-border hover:border-orange-300"
                    }`}
                  >
                    <div className={`font-medium mb-1 ${isToday ? "text-orange-600" : ""}`}>{day}</div>
                    {daySchedules.slice(0, 2).map((s: any, idx: number) => (
                      <div key={idx} className="text-[10px] truncate rounded px-1 py-0.5 mb-0.5 bg-primary/10 text-primary">
                        {s.title || s.name || 'Event'}
                      </div>
                    ))}
                    {daySchedules.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{daySchedules.length - 2} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Schedules List */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              All Schedules
            </h2>
            {isLoading ? (
              <div className="text-center text-sm text-muted-foreground py-8">Loading schedules...</div>
            ) : allSchedules.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No schedules yet. Click "Schedule Meeting" to create one.
              </div>
            ) : (
              <div className="space-y-3">
                {allSchedules.map((s: any) => (
                  <div key={s._id} className="rounded-xl border border-border p-3 space-y-1">
                    <div className="font-medium text-sm">{s.title || s.name || '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      with {s.client?.name || s.clientName || '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.date ? new Date(s.date).toLocaleDateString() : '—'}
                      {s.date ? ` at ${new Date(s.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </div>
                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[s.status || 'scheduled'] || statusColors.scheduled}`}>
                      {s.status || 'scheduled'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Schedules Table */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold text-lg mb-4">Schedules Table</h2>
          {allSchedules.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">No schedules to display</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="text-left">
                    {["Title", "Client", "Date", "Time", "Status"].map((h) => (
                      <th key={h} className="pb-2 pr-3 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSchedules.map((s: any) => (
                    <tr key={s._id} className="border-t border-border/50 hover:bg-accent/30">
                      <td className="py-2 pr-3 font-medium">{s.title || s.name || '—'}</td>
                      <td className="pr-3 text-muted-foreground">{s.client?.name || s.clientName || '—'}</td>
                      <td className="pr-3 text-muted-foreground">
                        {s.date ? new Date(s.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="pr-3 text-muted-foreground">
                        {s.date ? new Date(s.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="pr-3">
                        <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColors[s.status || 'scheduled'] || statusColors.scheduled}`}>
                          {s.status || 'scheduled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}