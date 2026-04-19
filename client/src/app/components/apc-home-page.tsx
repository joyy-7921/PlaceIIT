import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { StatsCard } from "@/app/components/stats-card";
import {
  Users,
  UserCog,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Briefcase,
  User,
  Award,
  Loader2,
  Send,
  Settings,
  Trash2,
  ShieldAlert,
} from "lucide-react";
import { adminApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { useAuth } from "@/app/auth-context";
import { formatSlotLabel } from "@/app/lib/format";
import { toast } from "sonner";

interface APCHomePageProps {
  userName: string;
  stats: {
    students: number;
    cocos: number;
    companies: number;
  };
  onNavigate: (page: string) => void;
}

interface ScheduleItem {
  id: string;
  company: string;
  time: string;
  venue: string;
  candidates: number;
  status: string;
}

export function APCHomePage({ userName, stats, onNavigate }: APCHomePageProps) {
  const { socket } = useSocket();
  const auth = useAuth();
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  // ── Drive State ──────────────────────────────────────────────────────────────
  const [driveDay, setDriveDay] = useState(1);
  const [driveSlot, setDriveSlot] = useState("morning");
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState("morning");
  const [showDriveConfirm, setShowDriveConfirm] = useState(false);
  const [updatingDrive, setUpdatingDrive] = useState(false);

  // ── Broadcast Notification ───────────────────────────────────────────────────
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("general");
  const [notifAudience, setNotifAudience] = useState("everyone");
  const [sendingNotif, setSendingNotif] = useState(false);

  // ── Reset State ───────────────────────────────────────────────────────────────
  const [showResetApcs, setShowResetApcs] = useState(false);
  const [showResetStudents, setShowResetStudents] = useState(false);
  const [showResetCocos, setShowResetCocos] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchSchedule = useCallback(async () => {
    setLoadingSchedule(true);
    try {
      const data: any = await adminApi.getCompanies();
      const companies = Array.isArray(data) ? data : data.companies ?? [];
      const items: ScheduleItem[] = companies.slice(0, 5).map((c: any, i: number) => ({
        id: c._id ?? String(i),
        company: c.name ?? "—",
        time: formatSlotLabel(c.slot),
        venue: c.venue ?? "TBA",
        candidates: c.shortlistedStudents?.length ?? 0,
        status: c.walkInOpen ? "ongoing" : "upcoming",
      }));
      setSchedule(items);
    } catch {
      setSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  }, []);

  const fetchDriveState = useCallback(async () => {
    try {
      const data: any = await adminApi.getDriveState();
      setDriveDay(data.currentDay ?? 1);
      setDriveSlot(data.currentSlot ?? "morning");
      setSelectedDay(data.currentDay ?? 1);
      setSelectedSlot(data.currentSlot ?? "morning");
    } catch {
      // defaults already set
    }
  }, []);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);
  useEffect(() => { fetchDriveState(); }, [fetchDriveState]);

  // Live schedule refresh
  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchSchedule();
    socket.on("walkin:updated", refresh);
    socket.on("queue:updated", refresh);
    return () => {
      socket.off("walkin:updated", refresh);
      socket.off("queue:updated", refresh);
    };
  }, [socket, fetchSchedule]);

  // Live drive state sync
  useEffect(() => {
    if (!socket) return;
    const handleDriveUpdate = (data: any) => {
      setDriveDay(data.currentDay);
      setDriveSlot(data.currentSlot);
      setSelectedDay(data.currentDay);
      setSelectedSlot(data.currentSlot);
    };
    socket.on("driveState:updated", handleDriveUpdate);
    return () => { socket.off("driveState:updated", handleDriveUpdate); };
  }, [socket]);

  // ── Drive State Update ───────────────────────────────────────────────────────
  const handleDriveUpdate = async () => {
    setUpdatingDrive(true);
    try {
      await adminApi.updateDriveState({ day: selectedDay, slot: selectedSlot });
      setDriveDay(selectedDay);
      setDriveSlot(selectedSlot);
      toast.success(`Drive updated to Day ${selectedDay}, ${selectedSlot.charAt(0).toUpperCase() + selectedSlot.slice(1)} Slot`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update drive state");
    } finally {
      setUpdatingDrive(false);
      setShowDriveConfirm(false);
    }
  };

  // ── Broadcast Notification ───────────────────────────────────────────────────
  const handleSendNotification = async () => {
    if (!notifMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setSendingNotif(true);
    try {
      const res: any = await adminApi.sendBroadcastNotification({
        message: notifMessage.trim(),
        type: notifType,
        audience: notifAudience,
      });
      toast.success(res.message || "Notification sent");
      setNotifMessage("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification");
    } finally {
      setSendingNotif(false);
    }
  };

  const slotLabel = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // ── Reset Handlers ───────────────────────────────────────────────────────────
  const handleResetApcs = async () => {
    setResetting(true);
    try {
      const res: any = await adminApi.resetAllSubApcs();
      toast.success(res.message || "All sub-APCs deleted");
      setShowResetApcs(false);
      setResetConfirmText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete sub-APCs");
    } finally {
      setResetting(false);
    }
  };

  const handleResetStudents = async () => {
    setResetting(true);
    try {
      const res: any = await adminApi.resetAllStudents();
      toast.success(res.message || "All students deleted");
      setShowResetStudents(false);
      setResetConfirmText("");
      fetchSchedule();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete students");
    } finally {
      setResetting(false);
    }
  };

  const handleResetCocos = async () => {
    setResetting(true);
    try {
      const res: any = await adminApi.resetAllCocos();
      toast.success(res.message || "All CoCos deleted");
      setShowResetCocos(false);
      setResetConfirmText("");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete CoCos");
    } finally {
      setResetting(false);
    }
  };

  return (
    <>
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3">Hello, {userName}</h1>
        <p className="text-gray-600 text-base sm:text-lg">
          All the best for managing placements today. You have{" "}
          <span className="text-indigo-600 font-semibold">{stats.companies} active companies</span> pending.
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-8">
        <StatsCard
          title="Total Students"
          value={stats.students}
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Total CoCos"
          value={stats.cocos}
          icon={UserCog}
          iconColor="text-green-600"
        />
        <StatsCard
          title="Total Companies"
          value={stats.companies}
          icon={Building2}
          iconColor="text-purple-600"
        />
      </div>

      {/* ──────── Drive Control + Notifications (SIDE BY SIDE) ──────── */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* FEATURE 1: APC Control Panel (Day & Slot) */}
        <Card className="border-indigo-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-xl flex items-center gap-2">
              <Settings className="h-5 w-5 text-indigo-600" />
              Drive Control Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-600 text-white font-bold text-sm shadow-sm">
                Day {driveDay}
              </span>
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-600 text-white font-bold text-sm shadow-sm">
                {slotLabel(driveSlot)} Slot
              </span>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Select Day</Label>
                <Select value={String(selectedDay)} onValueChange={(v) => setSelectedDay(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select Day" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 20 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Select Slot</Label>
                <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                  <SelectTrigger><SelectValue placeholder="Select Slot" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="afternoon">Afternoon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => setShowDriveConfirm(true)}
              >
                Update
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* FEATURE 2: APC Notification System */}
        <Card className="border-amber-200">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-xl flex items-center gap-2">
              <Send className="h-5 w-5 text-amber-600" />
              Send Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Message</Label>
              <textarea
                className="w-full rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px] resize-y"
                placeholder="Type your notification message..."
                value={notifMessage}
                onChange={(e) => setNotifMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Notification Type</Label>
                <Select value={notifType} onValueChange={setNotifType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="schedule_update">Schedule Update</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Audience</Label>
                <Select value={notifAudience} onValueChange={setNotifAudience}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="students">Only Students</SelectItem>
                    <SelectItem value="cocos">Only CoCos</SelectItem>
                    <SelectItem value="everyone">Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white"
                onClick={handleSendNotification}
                disabled={sendingNotif || !notifMessage.trim()}
              >
                {sendingNotif && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Send Notification
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drive State Confirmation Modal */}
      <Dialog open={showDriveConfirm} onOpenChange={setShowDriveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Drive State Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to transition the campus drive to Day {selectedDay}, {slotLabel(selectedSlot)} Slot? This will instantly update the dashboard for all users.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDriveConfirm(false)}>Cancel</Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleDriveUpdate}
              disabled={updatingDrive}
            >
              {updatingDrive && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ──────── Today's Schedule (FEATURE 3: Status badge removed) ──────── */}
      <div className="mb-8">
        <Card>
          <CardHeader className="border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-600" />
                Today's Schedule
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate("manage-companies")}
                className="text-indigo-600 hover:text-indigo-700"
              >
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingSchedule ? (
              <div className="flex items-center justify-center py-8 text-gray-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : schedule.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Calendar className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                <p>No companies scheduled yet. <button onClick={() => onNavigate("manage-companies")} className="text-indigo-600 hover:underline font-medium">Add one</button></p>
              </div>
            ) : (
              <div className="space-y-4">
                {schedule.map((interview) => (
                  <div
                    key={interview.id}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors gap-2"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">{interview.company}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {interview.time}
                        </div>
                        <div className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {interview.venue}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {interview.candidates} candidates
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => onNavigate("student-search")}
            >
              <Users className="h-6 w-6 text-indigo-600" />
              <span className="text-sm font-medium">Search Students</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => onNavigate("manage-cocos")}
            >
              <UserCog className="h-6 w-6 text-green-600" />
              <span className="text-sm font-medium">Manage CoCos</span>
            </Button>
            {auth.isMainAdmin && (
              <Button
                variant="outline"
                className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
                onClick={() => onNavigate("manage-apcs")}
              >
                <Award className="h-6 w-6 text-indigo-600" />
                <span className="text-sm font-medium">Manage APCs</span>
              </Button>
            )}
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => onNavigate("manage-companies")}
            >
              <Building2 className="h-6 w-6 text-purple-600" />
              <span className="text-sm font-medium">Manage Companies</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => onNavigate("queries")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-amber-600"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
              <span className="text-sm font-medium">Student Queries</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 bg-white hover:bg-indigo-50 hover:border-indigo-300"
              onClick={() => onNavigate("profile")}
            >
              <User className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium">My Profile</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ──────── Database Reset Section ──────── */}
      <Card className="border-red-200 mt-8">
        <CardHeader className="border-b border-gray-100">
          <CardTitle className="text-xl flex items-center gap-2 text-red-700">
            <ShieldAlert className="h-5 w-5" />
            Database Reset
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">Irreversible actions for tenure/phase transitions. Use with extreme caution.</p>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {auth.isMainAdmin && (
              <Button
                variant="outline"
                className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => { setResetConfirmText(""); setShowResetApcs(true); }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All APCs
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => { setResetConfirmText(""); setShowResetStudents(true); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All Students
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => { setResetConfirmText(""); setShowResetCocos(true); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete All CoCos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Reset Confirmation Dialogs ── */}
      <AlertDialog open={showResetApcs} onOpenChange={setShowResetApcs}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">Delete All APCs</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all APC accounts except yours. This action cannot be undone.
              <br /><br />
              Type <strong>DELETE ALL APCS</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder="Type confirmation here"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetApcs}
              disabled={resetConfirmText !== "DELETE ALL APCS" || resetting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete All APCs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetStudents} onOpenChange={setShowResetStudents}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">Delete All Students</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all student accounts, their notifications, queries, and queue entries. This action cannot be undone.
              <br /><br />
              Type <strong>DELETE ALL STUDENTS</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder="Type confirmation here"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetStudents}
              disabled={resetConfirmText !== "DELETE ALL STUDENTS" || resetting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete All Students
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetCocos} onOpenChange={setShowResetCocos}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">Delete All CoCos</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all coordinator accounts, their notifications, and remove all company assignments. This action cannot be undone.
              <br /><br />
              Type <strong>DELETE ALL COCOS</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={resetConfirmText}
            onChange={(e) => setResetConfirmText(e.target.value)}
            placeholder="Type confirmation here"
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResetConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetCocos}
              disabled={resetConfirmText !== "DELETE ALL COCOS" || resetting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {resetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete All CoCos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}