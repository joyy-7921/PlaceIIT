import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/app/auth-context";
import { APCHomePage } from "@/app/components/apc-home-page";
import { adminApi } from "@/app/lib/api";

export function APCHomeRoute() {
    const navigate = useNavigate();
    const auth = useAuth();

    const [stats, setStats] = useState({ students: 0, cocos: 0, companies: 0 });

    useEffect(() => {
        adminApi
            .getStats()
            .then((data: any) => {
                setStats({
                    students: data.students ?? 0,
                    cocos: data.coordinators ?? data.cocos ?? 0,
                    companies: data.companies ?? 0,
                });
            })
            .catch(() => {
                setStats({ students: 0, cocos: 0, companies: 0 });
            });
    }, []);

    const handleNavigate = (page: string) => {
        switch (page) {
            case "student-search":
                navigate("/apc/students");
                break;
            case "manage-cocos":
                navigate("/apc/cocos");
                break;
            case "manage-companies":
                navigate("/apc/companies");
                break;
            case "profile":
                navigate("/apc/profile");
                break;
            default:
                navigate("/apc");
        }
    };

    return (
        <APCHomePage
            userName={auth.userName}
            stats={stats}
            onNavigate={handleNavigate}
        />
    );
}
