import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  Building2, Users, UserPlus, Search, Phone, Mail, AlertCircle, CheckCircle,
  RotateCw, CircleDot, MapPin, XCircle, UserCheck, Loader2, Send
} from "lucide-react";
import { cocoApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  contact: string;
  emergencyContact: string;
  status: "in-queue" | "in-interview" | "completed";
  round: number;
  locationStatus: "in-queue" | "in-interview" | "no-show" | "completed-day";
  currentCompany?: string;
  userId: string;
}

interface Panel {
  id: string;
  name: string;
  members: string[];
  room: string;
  currentRound: number;
  currentStudent?: { name: string; rollNo: string };
}

interface CoCoHomePageProps {
  companyName: string;
  onRoundTracking: () => void;
}

export function CoCoHomePage({ companyName, onRoundTracking }: CoCoHomePageProps) {
  const { socket } = useSocket();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRound, setSelectedRound] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [addingPanel, setAddingPanel] = useState(false);
  const [isWalkinActive, setIsWalkinActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const [company, setCompany] = useState({
    id: "",
    name: companyName || "—",
    logo: "",
    role: "",
    venue: "—",
    currentRound: 1,
    totalRounds: 1,
  });

  const [students, setStudents] = useState<Student[]>([]);
  const [panels, setPanels] = useState<Panel[]>([]);

  // Panel form
  const [panelName, setPanelName] = useState("");
  const [panelRoom, setPanelRoom] = useState("");
  const [panelMembers, setPanelMembers] = useState("");

  // Add Student to Company state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [addingStudentId, setAddingStudentId] = useState<string | null>(null);

  const normalizeStudent = (raw: any, i: number): Student => {
    const qe = raw.queueEntry ?? raw;
    const statusRaw: string = qe.status ?? "in-queue";
    const statusMap: Record<string, Student["status"]> = {
      in_queue: "in-queue", waiting: "in-queue", "in-queue": "in-queue",
      in_interview: "in-interview", interviewing: "in-interview", "in-interview": "in-interview",
      completed: "completed", done: "completed",
    };
    return {
      id: raw._id ?? raw.id ?? raw.student?._id ?? String(i),
      name: raw.name ?? raw.student?.name ?? "—",
      rollNo: raw.rollNumber ?? raw.student?.rollNumber ?? "—",
      contact: raw.contact ?? raw.student?.contact ?? "—",
      emergencyContact: raw.emergencyContact?.phone ?? raw.student?.emergencyContact?.phone ?? "—",
      status: statusMap[statusRaw] ?? "in-queue",
      round: raw.round ?? raw.currentRound ?? 1,
      locationStatus: (statusMap[statusRaw] ?? "in-queue") as Student["locationStatus"],
      currentCompany: raw.companyName ?? companyName,
      userId: raw.userId?._id ?? (typeof raw.userId === 'string' ? raw.userId : '') ?? "",
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const companyRes: any = await cocoApi.getAssignedCompany();
      const companyObj = Array.isArray(companyRes)
        ? companyRes.find((c: any) => (c.name ?? "").toLowerCase() === companyName.toLowerCase()) ?? companyRes[0]
        : companyRes.company ?? companyRes;

      if (companyObj) {
        const cid = companyObj._id ?? companyObj.id ?? "";
        setCompany({
          id: cid,
          name: companyObj.name ?? companyName,
          logo: companyObj.logo ?? "",
          role: companyObj.role ?? "",
          venue: companyObj.venue ?? "TBA",
          currentRound: companyObj.currentRound ?? 1,
          totalRounds: companyObj.totalRounds ?? 1,
        });
        setIsWalkinActive(!!companyObj.walkInOpen);

        if (cid) {
          const studentsData: any = await cocoApi.getShortlistedStudents(cid).catch(() => []);
          const sList = Array.isArray(studentsData) ? studentsData : studentsData.students ?? [];
          setStudents(sList.map(normalizeStudent));

          try {
            const panelsData: any = await cocoApi.getPanels(cid).catch(() => []);
            const pList = Array.isArray(panelsData) ? panelsData : panelsData.panels ?? [];
            setPanels(pList.map((p: any) => ({
              id: p._id || p.id,
              name: p.panelName,
              members: p.interviewers || [],
              room: p.venue || companyObj.venue || "TBA",
              currentRound: p.roundId?.roundNumber || companyObj.currentRound || 1,
            })));
          } catch (e) {
            console.error("Failed to fetch panels", e);
          }
        }
      }
    } catch {
      toast.error("Failed to load company data");
    } finally {
      setLoading(false);
    }
  }, [companyName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!socket || !company.id) return;
    socket.emit("join:company", company.id);
    const handleUpdate = () => fetchData();
    socket.on("queue:updated", handleUpdate);
    socket.on("status:updated", handleUpdate);
    socket.on("walkin:updated", handleUpdate);
    return () => {
      socket.off("queue:updated", handleUpdate);
      socket.off("status:updated", handleUpdate);
      socket.off("walkin:updated", handleUpdate);
    };
  }, [socket, company.id, fetchData]);

  const handleSearchStudents = async () => {
    if (!studentSearchQuery.trim()) return;
    setSearchingStudents(true);
    try {
      const data: any = await cocoApi.searchStudents(studentSearchQuery);
      setSearchResults(Array.isArray(data) ? data : data.students ?? []);
    } catch {
      toast.error("Failed to search students");
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleAddStudentToCompany = async (studentId: string, studentName: string) => {
    if (!company.id) return toast.error("No company assigned");
    setAddingStudentId(studentId);
    try {
      await cocoApi.addStudentToCompany({ studentId, companyId: company.id });
      toast.success(`${studentName} added to ${company.name}`);
      setSearchResults(prev => prev.filter(s => (s._id || s.id) !== studentId));
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add student");
    } finally {
      setAddingStudentId(null);
    }
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.rollNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRound = selectedRound === "all" || student.round === parseInt(selectedRound);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "yet-to-interview" && student.status === "in-queue") ||
      statusFilter === student.status;
    return matchesSearch && matchesRound && matchesStatus;
  });

  const handleUpdateStatus = async (studentId: string, newStatus: Student["status"]) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status: newStatus } : s));
    try {
      await cocoApi.updateStudentStatus({ studentId, companyId: company.id, status: newStatus });
    } catch {
      toast.error("Failed to update status");
      fetchData();
    }
  };

  const handleSendNotification = async (studentId: string, type: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student?.userId) return toast.error("Student user information not found");
    try {
      const msg = type === "come"
        ? `Please proceed to ${company.venue} for your ${company.name} interview.`
        : `Update regarding your ${company.name} interview.`;
      await cocoApi.sendNotification({ studentUserId: student.userId, companyId: company.id, message: msg });
      toast.success("Notification sent!");
    } catch {
      toast.error("Failed to send notification");
    }
  };

  const handleToggleWalkin = async () => {
    const newState = !isWalkinActive;
    setIsWalkinActive(newState);
    try {
      if (company.id) await cocoApi.toggleWalkIn(company.id, { enabled: newState });
      toast.success(newState ? "Walk-in activated" : "Walk-in deactivated");
    } catch {
      setIsWalkinActive(!newState);
      toast.error("Failed to toggle walk-in");
    }
  };

  const handleAddPanel = async () => {
    if (!panelName || !panelRoom) return;
    setAddingPanel(true);
    try {
      await cocoApi.addPanel({
        companyId: company.id,
        panelName,
        venue: panelRoom,
        interviewers: panelMembers.split(",").map(m => m.trim()).filter(Boolean),
      });
      toast.success("Panel added!");
      setPanelName(""); setPanelRoom(""); setPanelMembers(""); setIsAddPanelOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add panel");
    } finally {
      setAddingPanel(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-queue": return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertCircle className="h-3 w-3 mr-1" />In Queue</Badge>;
      case "in-interview": return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><RotateCw className="h-3 w-3 mr-1" />In Interview</Badge>;
      case "completed": return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default: return null;
    }
  };

  const getLocationBadge = (locationStatus: string, currentCompany?: string) => {
    const base = "border rounded-lg p-3 flex items-center mb-4";
    if (locationStatus === "in-queue") return <div className={`${base} bg-blue-50 border-blue-200 text-blue-900`}><MapPin className="h-4 w-4 mr-2" />Waiting in {currentCompany}'s queue</div>;
    if (locationStatus === "in-interview") return <div className={`${base} bg-purple-50 border-purple-200 text-purple-900`}><CircleDot className="h-4 w-4 mr-2 animate-pulse" />Interviewing at {currentCompany}</div>;
    if (locationStatus === "no-show") return <div className={`${base} bg-red-50 border-red-200 text-red-900`}><XCircle className="h-4 w-4 mr-2" />Did not appear</div>;
    if (locationStatus === "completed-day") return <div className={`${base} bg-green-50 border-green-200 text-green-900`}><UserCheck className="h-4 w-4 mr-2" />Completed for the day</div>;
    return null;
  };

  if (loading) return <div className="flex items-center justify-center py-24 text-gray-400 gap-2"><Loader2 className="h-6 w-6 animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="h-16 w-16 rounded-lg bg-white flex items-center justify-center shadow-md">
                {company.logo ? <img src={company.logo} className="h-12 w-12 object-contain" /> : <span className="text-2xl font-bold text-gray-700">{company.name.charAt(0)}</span>}
              </div>
              <div>
                <CardTitle className="text-2xl text-gray-900 mb-2">{company.name}</CardTitle>
                <p className="text-sm text-gray-600">{company.venue}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onRoundTracking} className="border-green-600 text-green-600 hover:bg-green-50"><RotateCw className="h-4 w-4 mr-2" /> Round Tracking</Button>
              <Button variant={isWalkinActive ? "default" : "outline"} onClick={handleToggleWalkin} className={isWalkinActive ? "bg-green-600" : "border-green-600 text-green-600"}><Building2 className="h-4 w-4 mr-2" />{isWalkinActive ? "Walk-in Active" : "Activate Walk-in"}</Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center"><Users className="h-5 w-5 mr-2 text-green-600" />Interview Panels</CardTitle>
          <Dialog open={isAddPanelOpen} onOpenChange={setIsAddPanelOpen}>
            <DialogTrigger asChild><Button className="bg-green-600 hover:bg-green-700"><UserPlus className="h-4 w-4 mr-2" />Add Panel</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add New Panel</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input placeholder="Panel Name" value={panelName} onChange={(e) => setPanelName(e.target.value)} />
                <Input placeholder="Room Number" value={panelRoom} onChange={(e) => setPanelRoom(e.target.value)} />
                <Input placeholder="Members (comma separated)" value={panelMembers} onChange={(e) => setPanelMembers(e.target.value)} />
                <Button className="w-full bg-green-600" onClick={handleAddPanel} disabled={addingPanel}>{addingPanel ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Panel"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {panels.map((panel) => (
              <Card key={panel.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{panel.name}</h3>
                    <Badge variant="outline">{panel.room}</Badge>
                  </div>
                  <div className="text-sm text-gray-600">Members: {panel.members.join(", ")}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center"><Users className="h-5 w-5 mr-2 text-green-600" />Students List</CardTitle>
          <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
            <DialogTrigger asChild><Button className="bg-indigo-600 hover:bg-indigo-700"><UserPlus className="h-4 w-4 mr-2" />Add Student</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add Student to {company.name}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <Input placeholder="Search name/roll..." value={studentSearchQuery} onChange={(e) => setStudentSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearchStudents()} />
                  <Button onClick={handleSearchStudents} disabled={searchingStudents}>{searchingStudents ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}</Button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {searchResults.map((s: any) => (
                    <div key={s._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div><p className="font-semibold">{s.name}</p><p className="text-xs text-gray-500">{s.rollNumber}</p></div>
                      <Button size="sm" className="bg-green-600" onClick={() => handleAddStudentToCompany(s._id, s.name)} disabled={addingStudentId === s._id}>Add</Button>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input placeholder="Filter students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="in-queue">In Queue</SelectItem>
                <SelectItem value="in-interview">In Interview</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <Card key={student.id} className="border-2 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{student.name}</h3>
                    <p className="text-sm text-gray-500">{student.rollNo}</p>
                    <div className="flex gap-4 text-xs mt-2"><span className="flex items-center"><Phone className="h-3 w-3 mr-1" />{student.contact}</span></div>
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(student.status)}
                    <Select value={student.status} onValueChange={(v) => handleUpdateStatus(student.id, v as any)}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in-queue">In Queue</SelectItem>
                        <SelectItem value="in-interview">In Interview</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button size="sm" variant="outline" onClick={() => handleSendNotification(student.id, "come")}><Send className="h-3 w-3 mr-1" /> Interview Call</Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}