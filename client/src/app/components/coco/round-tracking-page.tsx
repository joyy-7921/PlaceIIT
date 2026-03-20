import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Badge } from "@/app/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { ArrowLeft, UserPlus, Users, Clock, CheckCircle, AlertCircle, Upload, Loader2, ArrowUpCircle } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/app/components/ui/select";
import { cocoApi } from "@/app/lib/api";
import { useSocket } from "@/app/socket-context";
import { toast } from "sonner";

interface Student {
  id: string;
  name: string;
  rollNo: string;
  status: "in-queue" | "yet-to-interview" | "completed";
  round: number;
}

interface Panel {
  _id: string;
  panelName: string;
  interviewers: string[];
  venue?: string;
}

interface RoundTrackingPageProps {
  companyName?: string;
  onBack: () => void;
}

export function RoundTrackingPage({ companyName, onBack }: RoundTrackingPageProps) {
  const { socket } = useSocket();
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [addMethod, setAddMethod] = useState<"manual" | "excel" | "promote">("manual");
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [totalRounds, setTotalRounds] = useState(3);
  const [studentsByRound, setStudentsByRound] = useState<Record<number, Student[]>>({});
  const [panelsByRound, setPanelsByRound] = useState<Record<number, Panel[]>>({});
  const [roundIds, setRoundIds] = useState<Record<number, string>>({});
  const [selectedRoundForAdd, setSelectedRoundForAdd] = useState(1);
  const [studentSearchForAdd, setStudentSearchForAdd] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [foundStudents, setFoundStudents] = useState<any[]>([]);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [excelRound, setExcelRound] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [promotingExcel, setPromotingExcel] = useState(false);
  const promoteFileInputRef = useRef<HTMLInputElement>(null);

  const normalizeStudent = (raw: any, i: number, round: number): Student => {
    const statusRaw: string = raw.status ?? raw.queueEntry?.status ?? "in-queue";
    const statusMap: Record<string, Student["status"]> = {
      in_queue: "in-queue", waiting: "in-queue", "in-queue": "in-queue",
      in_interview: "yet-to-interview", upcoming: "yet-to-interview", "yet-to-interview": "yet-to-interview",
      completed: "completed", done: "completed",
    };
    return {
      id: raw._id ?? raw.id ?? raw.student?._id ?? String(i),
      name: raw.name ?? raw.student?.name ?? "—",
      rollNo: raw.rollNumber ?? raw.student?.rollNumber ?? "—",
      status: statusMap[statusRaw] ?? "in-queue",
      round,
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const companyRes: any = await cocoApi.getAssignedCompany();
      const arr = Array.isArray(companyRes) ? companyRes : (companyRes.companies || (companyRes.company ? [companyRes.company] : []));

      if (arr.length === 0) {
        setLoading(false);
        return;
      }

      let companyObj = companyName 
        ? arr.find((c: any) => (c.name ?? "").toLowerCase() === companyName.toLowerCase())
        : arr[0];

      if (!companyObj) companyObj = arr[0];

      if (!companyObj) {
        setLoading(false);
        return;
      }

      const cid = companyObj._id ?? companyObj.id ?? "";
      setCompanyId(cid);
      const rounds = 3;
      setTotalRounds(rounds);

      if (cid) {
        const roundsData: any = await cocoApi.getRounds(cid).catch(() => null);
        const byRound: Record<number, Student[]> = {};
        const panelsRoundMap: Record<number, Panel[]> = {};
        const rIds: Record<number, string> = {};

        for (let r = 1; r <= rounds; r++) {
          byRound[r] = [];
          panelsRoundMap[r] = [];
        }

        if (roundsData) {
          const roundsList = Array.isArray(roundsData) ? roundsData : roundsData.rounds ?? [];
          roundsList.forEach((rd: any) => {
            const rn = rd.roundNumber ?? rd.round ?? 1;
            const studs = rd.students ?? rd.shortlistedStudents ?? [];
            byRound[rn] = studs.map((s: any, i: number) => normalizeStudent(s, i, rn));

            if (rd.panels && Array.isArray(rd.panels)) {
              panelsRoundMap[rn] = rd.panels;
            }
            if (rd._id) rIds[rn] = rd._id;
          });
        }
        setRoundIds(rIds);

        // Fallback: use shortlisted students for round 1 if rounds API didn't return data
        if (Object.values(byRound).every((arr) => arr.length === 0)) {
          const studentsData: any = await cocoApi.getShortlistedStudents(cid).catch(() => []);
          const sList = Array.isArray(studentsData) ? studentsData : studentsData.students ?? [];
          byRound[1] = sList.map((s: any, i: number) => normalizeStudent(s, i, 1));
        }

        setStudentsByRound(byRound);
        setPanelsByRound(panelsRoundMap);
      }
    } catch {
      toast.error("Failed to load round data");
    } finally {
      setLoading(false);
    }
  }, [companyName]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Real-time updates ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !companyId) return;
    socket.emit("join:company", companyId);
    const refresh = () => fetchData();
    socket.on("status:updated", refresh);
    socket.on("round:updated", refresh);
    socket.on("queue:updated", refresh);
    return () => {
      socket.off("status:updated", refresh);
      socket.off("round:updated", refresh);
      socket.off("queue:updated", refresh);
    };
  }, [socket, companyId, fetchData]);
  // ─────────────────────────────────────────────────────────────────────────

  const handleSearchStudent = async () => {
    if (!studentSearchForAdd) return;
    try {
      const data: any = await cocoApi.searchStudents(studentSearchForAdd);
      setFoundStudents(Array.isArray(data) ? data : data.students ?? []);
    } catch {
      toast.error("Failed to search students");
    }
  };

  const handleAddStudentToRound = async (studentId: string) => {
    setAddingStudent(true);
    try {
      // Use roundNumber-based approach which auto-creates the round on the server
      await cocoApi.addStudentToRound({
        studentId,
        companyId,
        roundNumber: selectedRoundForAdd,
        ...(roundIds[selectedRoundForAdd] ? { roundId: roundIds[selectedRoundForAdd] } : {}),
      });
      toast.success("Student added to round!");
      setIsAddStudentOpen(false);
      setFoundStudents([]);
      setStudentSearchForAdd("");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add student to round");
    } finally {
      setAddingStudent(false);
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingExcel(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", companyId);
      formData.append("roundNumber", String(excelRound));
      const result: any = await cocoApi.uploadRoundExcel(formData);
      toast.success(result.message || "Students uploaded!");
      if (result.notFound?.length > 0) {
        toast.warning(`Not found: ${result.notFound.join(", ")}`);
      }
      setIsAddStudentOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload Excel");
    } finally {
      setUploadingExcel(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePromoteExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPromotingExcel(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyId", companyId);
      const result: any = await cocoApi.promoteStudentsExcel(formData);
      toast.success(result.message || "Students promoted!");
      if (result.notFound?.length > 0) {
        toast.warning(`Not found: ${result.notFound.join(", ")}`);
      }
      if (result.alreadyMaxRound?.length > 0) {
        toast.info(`Already at max round: ${result.alreadyMaxRound.join(", ")}`);
      }
      setIsAddStudentOpen(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to promote students");
    } finally {
      setPromotingExcel(false);
      if (promoteFileInputRef.current) promoteFileInputRef.current.value = "";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in-queue":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs"><Clock className="h-3 w-3 mr-1" />In Queue</Badge>;
      case "yet-to-interview":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Yet to Interview</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      default: return null;
    }
  };

  const renderStudentCard = (student: Student) => (
    <Card key={student.id} className="mb-3">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-gray-900">{student.name}</p>
            <p className="text-sm text-gray-600">{student.rollNo}</p>
          </div>
          {getStatusBadge(student.status)}
        </div>
      </CardContent>
    </Card>
  );

  const renderRoundColumn = (round: number) => {
    const students = studentsByRound[round] || [];
    const panels = panelsByRound[round] || [];

    const inQueue = students.filter((s) => s.status === "in-queue");
    const yetToInterview = students.filter((s) => s.status === "yet-to-interview");
    const completed = students.filter((s) => s.status === "completed");

    return (
      <Card className="h-full">
        <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50">
          <CardTitle className="flex items-center justify-between">
            <span>Round {round}</span>
            <Badge variant="outline">{students.length} Students</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {panels.length > 0 && (
            <div className="mb-6 bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
              <h3 className="text-sm font-semibold text-indigo-800 mb-2 flex items-center">
                Interview Panels
              </h3>
              <div className="space-y-2">
                {panels.map(panel => (
                  <div key={panel._id} className="bg-white p-2 rounded border border-indigo-50 shadow-sm text-sm">
                    <div className="font-semibold text-indigo-900">{panel.panelName}</div>
                    {panel.interviewers && panel.interviewers.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        By: {panel.interviewers.join(", ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {inQueue.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center"><Clock className="h-4 w-4 mr-2" />In Queue ({inQueue.length})</h3>
              {inQueue.map(renderStudentCard)}
            </div>
          )}
          {yetToInterview.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-yellow-700 mb-3 flex items-center"><AlertCircle className="h-4 w-4 mr-2" />Yet to Interview ({yetToInterview.length})</h3>
              {yetToInterview.map(renderStudentCard)}
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center"><CheckCircle className="h-4 w-4 mr-2" />Completed ({completed.length})</h3>
              {completed.map(renderStudentCard)}
            </div>
          )}
          {students.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No students in this round</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading round data…
      </div>
    );
  }

  if (!companyId) {
    return (
      <Card className="bg-gray-50 border-dashed border-2 m-6">
        <CardContent className="py-24 text-center flex flex-col items-center">
            <h2 className="text-2xl font-bold text-gray-700">No company assignments</h2>
            <p className="text-gray-500 mt-2">You cannot track rounds because no company is assigned to you.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Round Tracking</h1>
            <p className="text-gray-600">{companyName}</p>
          </div>
        </div>
        <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700"><UserPlus className="h-4 w-4 mr-2" />Add Students</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Students to Round</DialogTitle>
              <DialogDescription>Add students manually or upload an Excel file</DialogDescription>
            </DialogHeader>
            <Tabs value={addMethod} onValueChange={(v) => setAddMethod(v as "manual" | "excel" | "promote")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="excel">Excel Upload</TabsTrigger>
                <TabsTrigger value="promote">Promote</TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Round</Label>
                  <Select
                    value={String(selectedRoundForAdd)}
                    onValueChange={(v) => setSelectedRoundForAdd(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Round" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                        <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Student Search</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Name or Roll Number"
                      value={studentSearchForAdd}
                      onChange={(e) => setStudentSearchForAdd(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearchStudent()}
                    />
                    <Button onClick={handleSearchStudent} type="button" size="sm">Search</Button>
                  </div>
                </div>

                {foundStudents.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded p-2">
                    {foundStudents.map((s) => (
                      <div key={s._id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <div>
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-xs text-gray-500">{s.rollNumber}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-indigo-600"
                          onClick={() => handleAddStudentToRound(s._id)}
                          disabled={addingStudent}
                        >
                          {addingStudent ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="excel" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Round</Label>
                  <Select
                    value={String(excelRound)}
                    onValueChange={(v) => setExcelRound(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Round" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                        <SelectItem key={r} value={String(r)}>Round {r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-400 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">Excel file with student details</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-700">
                  <strong>Format:</strong> Excel file should have a column: <code>Roll Number</code>
                </div>
                {uploadingExcel && (
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                  </div>
                )}
              </TabsContent>
              <TabsContent value="promote" className="space-y-4 pt-4">
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm text-amber-800">
                  <ArrowUpCircle className="h-4 w-4 inline mr-1" />
                  <strong>Promote to Next Round:</strong> Upload an Excel with student roll numbers. Each student will be automatically moved to the next round.
                </div>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-amber-400 transition-colors"
                  onClick={() => promoteFileInputRef.current?.click()}
                >
                  <ArrowUpCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm text-gray-600 mb-2">Click to upload Excel</p>
                  <p className="text-xs text-gray-500">Students will be promoted to their next round</p>
                  <input
                    ref={promoteFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handlePromoteExcelUpload}
                  />
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-xs text-gray-700">
                  <strong>Format:</strong> Excel file should have a column: <code>Roll Number</code>
                </div>
                {promotingExcel && (
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Promoting…
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: Math.min(totalRounds, 5) }, (_, i) => i + 1).map((round) => (
          <div key={round}>{renderRoundColumn(round)}</div>
        ))}
      </div>
    </div>
  );
}