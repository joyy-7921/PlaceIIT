import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { StudentDetailsPage } from "@/app/components/student-details-page";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";
import { MessageSquare, Loader2 } from "lucide-react";
import { cocoApi } from "@/app/lib/api";

const PREDEFINED_MESSAGES = [
    "Please report to our interview panel right now.",
    "Your interview starts in 10 minutes. Please be ready.",
    "You've been moved to the next round. See you soon.",
    "Your interview has been slightly delayed. We'll call you shortly.",
    "Congratulations! You have cleared this round.",
    "Please bring a hard copy of your resume to the panel.",
    "Your interview is over for today. Thank you.",
];

export function CoCoStudentDetailsRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const student = location.state?.student;

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!student) {
        return <Navigate to="/coco/students" replace />;
    }

    const handleSendMessage = async (message: string) => {
        setLoading(true);
        setSuccess(null);
        setError(null);
        try {
            // In a real scenario, the CoCo would target a specific company ID.
            // For now, if they are searching all students, we assume the notification
            // is context-free or we pass a dummy companyId if required by the API.
            // E.g., sending the notification as a general alert, or needing to select a company.
            // For simplicity in this demo, we assume the CoCo is messaging on behalf of their primary assigned company
            // but without a company ID selector here, the backend might reject if companyId is strictly required. 
            // Assuming our notification service allows it or we pass a generic type.
            await cocoApi.sendNotification({
                studentUserId: student.userId || student.id, // Fallbacks in case the search returns just 'id' or 'userId'
                message: message
            });
            setSuccess(`Message sent to ${student.name}`);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to send message");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <StudentDetailsPage
                studentId={student.id}
                studentName={student.name}
                rollNo={student.rollNo}
                email={student.email}
                phone={student.phone}
                emergencyContact={student.emergencyContact}
                inInterview={student.inInterview}
                interviewWith={student.interviewWith}
                interviewVenue={student.interviewVenue}
                queuedFor={student.queuedFor}
                fetchCompanies={() => cocoApi.getStudentCompanies(student.id)}
                onBack={() => navigate("/coco/students")}
            />

            {/* Messaging Panel for CoCos */}
            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                Predefined Messages
            </h2>
            <Card>
                <CardHeader>
                    <CardTitle>Send Notification</CardTitle>
                    <CardDescription>Select a predefined message to send an instant notification to {student.name}.</CardDescription>
                </CardHeader>
                <CardContent>
                    {success && (
                        <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm font-medium rounded-lg border border-green-200">
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200">
                            {error}
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-3">
                        {PREDEFINED_MESSAGES.map((msg, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                className="justify-start h-auto py-3 px-4 text-left font-normal whitespace-normal w-full"
                                onClick={() => handleSendMessage(msg)}
                                disabled={loading}
                            >
                                <div className="flex gap-2 w-full">
                                    <span className="text-gray-500 font-medium shrink-0">{idx + 1}.</span>
                                    <span className="text-gray-800 flex-1">{msg}</span>
                                </div>
                            </Button>
                        ))}
                    </div>
                    {loading && (
                        <div className="flex justify-center mt-4 text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Sending...
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
