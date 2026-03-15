import { useNavigate } from "react-router-dom";
import { StudentSearchPage } from "@/app/components/student-search-page";
import { cocoApi } from "@/app/lib/api";

export function CoCoStudentsRoute() {
    const navigate = useNavigate();

    const handleStudentClick = (student: any) => {
        navigate(`/coco/students/${student.id}`, { state: { student } });
    };

    return <StudentSearchPage onStudentClick={handleStudentClick} fetchApi={cocoApi.searchStudents} />;
}
