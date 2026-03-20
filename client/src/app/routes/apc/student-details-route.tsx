import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { StudentDetailsPage } from "@/app/components/student-details-page";
import { adminApi } from "@/app/lib/api";

export function APCStudentDetailsRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const student = location.state?.student;

    if (!student) {
        return <Navigate to="/apc/students" replace />;
    }

    return (
        <StudentDetailsPage
            studentId={student.id}
            studentName={student.name}
            rollNo={student.rollNo}
            email={student.email}
            phone={student.phone}
            emergencyContact={student.emergencyContact}
            department={student.department}
            cgpa={student.cgpa}
            resumeUrl={student.resumeUrl}
            inInterview={student.inInterview}
            interviewWith={student.interviewWith}
            interviewVenue={student.interviewVenue}
            fetchCompanies={() => adminApi.getStudentCompanies(student.id)}
            onBack={() => navigate("/apc/students")}
        />
    );
}
