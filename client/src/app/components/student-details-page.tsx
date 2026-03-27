import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import {
  ArrowLeft,
  Mail,
  Phone,
  FileText,
  GraduationCap,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { formatSlotLabel } from "@/app/lib/format";
interface Company {
  id: string;
  name: string;
  day: string;
  slot: string;
  venue: string;
  status: "Pending" | "Selected" | "Rejected";
  interviewDate: string;
}

interface StudentDetailsPageProps {
  studentId: string;
  studentName: string;
  rollNo: string;
  email: string;
  phone: string;
  emergencyContact: string;
  department: string;
  cgpa: number;
  resumeUrl: string;
  inInterview: boolean;
  interviewWith?: string;
  interviewVenue?: string;
  queuedFor?: string;
  fetchCompanies: () => Promise<any>;
  onBack: () => void;
}

export function StudentDetailsPage({
  studentId,
  studentName,
  rollNo,
  email,
  phone,
  emergencyContact,
  department,
  cgpa,
  resumeUrl,
  inInterview,
  interviewWith,
  interviewVenue,
  queuedFor,
  fetchCompanies,
  onBack
}: StudentDetailsPageProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchCompanies();
        setCompanies(Array.isArray(data) ? data : data.companies || []);
      } catch (err: any) {
        toast.error("Failed to load student's companies: " + (err.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchCompanies]);

  const filteredCompanies = companies;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24 text-gray-500 gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading student details...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{studentName}</h1>
          <p className="text-gray-500">Student profile and shortlisted companies</p>
        </div>
      </div>

      {/* Student Information Card */}
      <Card className="border-2 border-indigo-100">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl font-bold text-gray-900">Student Information</CardTitle>
            {inInterview ? (
              <span className="px-3 py-1.5 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded-full border border-yellow-300">
                In Interview
              </span>
            ) : (
              <span className="px-3 py-1.5 bg-green-100 text-green-800 text-sm font-semibold rounded-full border border-green-300">
                Available
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3 bg-indigo-50 p-4 rounded-lg">
              <GraduationCap className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Roll Number</div>
                <div className="font-semibold text-gray-900">{rollNo}</div>
              </div>
            </div>


          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
              <Mail className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</div>
                <div className="font-medium text-gray-900 break-all">{email}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-gray-50 p-4 rounded-lg">
              <Phone className="h-5 w-5 text-indigo-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</div>
                <div className="font-medium text-gray-900">{phone}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-red-50 p-4 rounded-lg">
              <Phone className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Emergency Contact</div>
                <div className="font-medium text-gray-900">{emergencyContact}</div>
              </div>
            </div>


          </div>

          {inInterview && interviewWith && (
            <div className="flex items-start gap-3 bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-6">
              <Clock className="h-5 w-5 text-yellow-700 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Current Interview</div>
                <div className="font-medium text-gray-900">
                  Interviewing with {interviewWith} at {interviewVenue}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shortlisted Companies List */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Shortlisted Companies ({filteredCompanies.length})</h2>
        <div className="space-y-3">
          {filteredCompanies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No companies found matching your filters.
              </CardContent>
            </Card>
          ) : (
            filteredCompanies.map((company) => (
              <Card key={company.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid md:grid-cols-4 gap-4 items-center">
                      <div className="md:col-span-1">
                        <div className="font-semibold text-gray-900 text-lg">{company.name}</div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Day</div>
                          <div className="font-medium text-gray-900">{company.day}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Slot</div>
                          <div className="font-medium text-gray-900">{formatSlotLabel(company.slot)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Venue</div>
                          <div className="font-medium text-gray-900">{company.venue}</div>
                        </div>
                      </div>

                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
