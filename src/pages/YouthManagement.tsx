import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Copy, CheckCircle2, Clock, Users, Eye, FileText, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface VolunteerRequest {
  id: string;
  role_name: string;
  department_code: string;
  vol_count: number;
  status?: string;
  created_at?: string;
}

interface Applicant {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  cv_url: string;
  skills_match: string;
  youth_status: string;
}

export default function YouthManagement() {
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<VolunteerRequest | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("volunteer_supply_requests")
        .select(`id, role_name, department_code, vol_count, status, created_at`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ في جلب البيانات", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async (requestId: string) => {
    try {
      setApplicantsLoading(true);
      const { data, error } = await supabase
        .from("volunteer_applicants" as any)
        .select("*")
        .eq("request_id", requestId);

      if (error) throw error;
      // عمل Type Cast هنا لحل مشكلة السوبابيز كومبيلر
      setApplicants((data as any) || []);
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ في جلب المتقدمين", description: error.message });
    } finally {
      setApplicantsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateLink = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const generatedCode = `ERC-VOL-${requestId.substring(0, 4)}-${randomId}`;

      const { error: linkError } = await supabase
        .from("volunteer_supply_requests" as any)
        .update({ status: "link_generated" })
        .eq("id", requestId);

      if (linkError) throw linkError;
      localStorage.setItem(`link_${requestId}`, generatedCode);

      toast({ title: "تم توليد الرابط بنجاح" });
      await fetchRequests();
    } catch (error: any) {
      toast({ variant: "destructive", title: "فشل توليد الرابط", description: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (applicantId: string, newStatus: 'short_listed' | 'rejected_by_youth') => {
    try {
      const { error } = await supabase
        .from("volunteer_applicants" as any)
        .update({ youth_status: newStatus })
        .eq("id", applicantId);

      if (error) throw error;

      toast({ title: "تم تحديث حالة المتطوع" });
      if (selectedRequest) fetchApplicants(selectedRequest.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "فشل التحديث", description: error.message });
    }
  };

  const handleSendToInterviews = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("volunteer_supply_requests" as any)
        .update({ status: "sent_to_interviews" })
        .eq("id", requestId);

      if (error) throw error;

      toast({ title: "تم إرسال القائمة للإدارة الطالبة 🚀", description: "ستظهر الأسماء الآن في قائمة مقابلات الإدارة الطالبة." });
      await fetchRequests();
    } catch (error: any) {
      toast({ variant: "destructive", title: "فشل الإرسال", description: error.message });
    }
  };

  const copyToClipboard = (requestId: string) => {
    const linkCode = localStorage.getItem(`link_${requestId}`) || `ERC-VOL-${requestId.substring(0, 4)}`;
    const baseUrl = window.location.origin + window.location.pathname;
    const fullLink = `${baseUrl}#/register-volunteer/${linkCode}`;
    navigator.clipboard.writeText(fullLink);
    toast({ title: "تم نسخ الرابط 📋" });
  };

  return (
    <AppLayout title="إدارة الشباب وتنمية التطوع">
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-700 p-6 text-white shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">الإدارة المركزية لشؤون التطوع</h2>
            <p className="text-red-100 text-sm mt-1">توليد روابط الاستمارات الإلكترونية، فلترة المتطوعين، وإرسال الكشوف للإدارات الطالبة.</p>
          </div>
          <Users className="w-12 h-12 text-red-200/50 hidden md:block" />
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-muted text-muted-foreground text-sm font-bold border-b border-border">
                  <th className="p-4">المهمة المطلوبة</th>
                  <th className="p-4">كود الإدارة</th>
                  <th className="p-4">العدد المطلوب</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((req) => {
                  const hasLink = req.status !== "pending_youth";
                  return (
                    <tr key={req.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-bold">{req.role_name}</td>
                      <td className="p-4 text-muted-foreground">{req.department_code}</td>
                      <td className="p-4 font-mono text-red-600 font-bold">{req.vol_count} متطوع</td>
                      <td className="p-4">
                        {req.status === "pending_youth" && (
                          <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-200">في الانتظار</span>
                        )}
                        {req.status === "link_generated" && (
                          <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium border border-green-200">جمع المتطوعين</span>
                        )}
                        {req.status === "sent_to_interviews" && (
                          <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium border border-blue-200">في المقابلات</span>
                        )}
                      </td>
                      <td className="p-4 text-center flex items-center justify-center gap-2">
                        {!hasLink ? (
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading === req.id} onClick={() => handleCreateLink(req.id)}>
                            <Link2 className="w-4 h-4 ml-1" /> توليد الرابط
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="border-green-600 text-green-700" onClick={() => copyToClipboard(req.id)}>
                              نسخ الرابط 📋
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="secondary" onClick={() => { setSelectedRequest(req); fetchApplicants(req.id); }}>
                                  <Eye className="w-4 h-4 ml-1" /> المتقدمين
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
                                <DialogHeader>
                                  <DialogTitle>طلبات المتطوعين لـ {req.role_name}</DialogTitle>
                                </DialogHeader>
                                {applicantsLoading ? (
                                  <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-red-600" /></div>
                                ) : applicants.length === 0 ? (
                                  <p className="text-center text-muted-foreground p-4">لا يوجد متقدمين حتى الآن عبر الرابط.</p>
                                ) : (
                                  <div className="space-y-4 mt-4">
                                    <table className="w-full text-right text-sm">
                                      <thead>
                                        <tr className="border-b font-bold text-muted-foreground">
                                          <th className="p-2">الاسم</th>
                                          <th className="p-2">الهاتف</th>
                                          <th className="p-2">الـ CV</th>
                                          <th className="p-2">التصفية</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {applicants.map((app) => (
                                          <tr key={app.id} className="border-b">
                                            <td className="p-2 font-medium">{app.full_name}</td>
                                            <td className="p-2 font-mono">{app.phone}</td>
                                            <td className="p-2">
                                              {app.cv_url ? (
                                                <a href={app.cv_url} target="_blank" rel="noreferrer" className="text-red-600 flex items-center gap-1 hover:underline">
                                                  <FileText className="w-4 h-4" /> عرض الملف
                                                </a>
                                              ) : <span className="text-muted-foreground">غير مرفق</span>}
                                            </td>
                                            <td className="p-2 flex gap-1">
                                              {/* تم تعديل الحجم هنا من xs إلى sm */}
                                              <Button size="sm" variant={app.youth_status === 'short_listed' ? "default" : "outline"} className={app.youth_status === 'short_listed' ? "bg-green-600 text-white" : ""} onClick={() => handleStatusChange(app.id, 'short_listed')}>
                                                <Check className="w-3.5 h-3.5" /> المقابلات
                                              </Button>
                                              <Button size="sm" variant={app.youth_status === 'rejected_by_youth' ? "destructive" : "outline"} onClick={() => handleStatusChange(app.id, 'rejected_by_youth')}>
                                                <X className="w-3.5 h-3.5" /> استبعاد
                                              </Button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {req.status === "link_generated" && (
                                      <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4" onClick={() => handleSendToInterviews(req.id)}>
                                        تصدير وإرسال المقبولين مبدئيًا للإدارة الطالبة 🚀
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}