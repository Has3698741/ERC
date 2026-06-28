import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Eye, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface VolunteerRequest {
  id: any;
  role_title: string;
  required_count: number;
  status: string;
  created_at?: string;
  isLegacy?: boolean; // لمعرفة لو السجل جاي من الجدول القديم
}

interface Applicant {
  id: string;
  form_id: string;
  applicant_data: {
    fullName?: string;
    phone?: string;
    email?: string;
    skills?: string;
    cvUrl?: string;
  };
  youth_status: string;
}

export default function YouthManagement() {
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<any | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // 1. محاولة القراءة أولاً من الجدول الجديد
      const { data: newData, error: newError } = await supabase
        .from("volunteer_supply_requests" as any)
        .select(`id, role_title, required_count, status, created_at`)
        .order("created_at", { ascending: false });

      if (!newError && newData && newData.length > 0) {
        // التحويل المزدوج لـ unknown لمنع اعتراض TypeScript نهائياً
        setRequests((newData as unknown) as VolunteerRequest[]);
        return;
      }

      // 2. الـ Fallback الآمن: لو الجدول الجديد مطلع خطأ كاش أو فاضي، اسحب من القديم فوراً وحوّل الحقول
      const { data: legacyData, error: legacyError } = await supabase
        .from("volunteer_requests" as any)
        .select(`id, role_name, vol_count, status, created_at`)
        .order("created_at", { ascending: false });

      if (legacyError) {
        console.error("Supabase Schema Cache Issue:", legacyError.message);
        setRequests([]);
        return;
      }

      // تحويل أسماء الحقول من الجدول القديم لتطابق الواجهة بشكل موحد
      const formattedRequests: VolunteerRequest[] = (legacyData || []).map((item: any) => ({
        id: item.id,
        role_title: item.role_name || "مهمة غير محددة",
        required_count: item.vol_count || 0,
        status: item.status || "pending",
        created_at: item.created_at,
        isLegacy: true
      }));

      setRequests(formattedRequests);

    } catch (error: any) {
      console.error("Silent Catch Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async (requestId: any, isLegacy?: boolean) => {
    try {
      setApplicantsLoading(true);
      
      // جلب الـ form_id المرتبط بالطلب
      const { data, error: formError } = await supabase
        .from("supply_request_forms" as any)
        .select("id")
        .eq("request_id", requestId)
        .maybeSingle();

      const formData = data as any;

      if (formError || !formData) {
        setApplicants([]);
        return;
      }

      setSelectedFormId(formData.id);

      // جلب المتقدمين بناءً على الـ form_id
      const { data: appData, error: appError } = await supabase
        .from("supply_request_applicants" as any)
        .select("*")
        .eq("form_id", formData.id);

      if (appError) throw appError;
      
      // التحويل الآمن هنا أيضاً لمنع مشاكل الـ Types
      setApplicants((appData as unknown) as Applicant[]);
    } catch (error: any) {
      toast({ variant: "destructive", title: "خطأ في جلب المتقدمين", description: error.message });
    } finally {
      setApplicantsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateLink = async (req: VolunteerRequest) => {
    try {
      setActionLoading(req.id);
      const generatedUuid = crypto.randomUUID();

      // إنشاء الرابط
      const { error: linkError } = await supabase
        .from("supply_request_forms" as any)
        .insert([{ request_id: req.id, public_link_uuid: generatedUuid, is_active: true }]);

      if (linkError) throw linkError;

      // تحديث الحالة في الجدول المناسب ديناميكياً
      const targetTable = req.isLegacy ? "volunteer_requests" : "volunteer_supply_requests";
      
      const { error: updateError } = await supabase
        .from(targetTable as any)
        .update({ status: "approved" })
        .eq("id", req.id);

      if (updateError) throw updateError;

      localStorage.setItem(`form_uuid_${req.id}`, generatedUuid);
      toast({ title: "تم توليد رابط الاستمارة بنجاح" });
      await fetchRequests();
    } catch (error: any) {
      toast({ variant: "destructive", title: "فشل توليد الرابط", description: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (applicantId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("supply_request_applicants" as any)
        .update({ youth_status: newStatus })
        .eq("id", applicantId);

      if (error) throw error;

      toast({ title: "تم تحديث حالة المتطوع" });
      if (selectedFormId) {
        const { data } = await supabase.from("supply_request_applicants" as any).select("*").eq("form_id", selectedFormId);
        // التحويل الآمن للـ state المحدثة لمنع تعليق الـ Build
        setApplicants((data as unknown) as Applicant[]);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "فشل التحديث", description: error.message });
    }
  };

  const copyToClipboard = (requestId: any) => {
    const uuid = localStorage.getItem(`form_uuid_${requestId}`) || requestId;
    const baseUrl = window.location.origin + window.location.pathname;
    const fullLink = `${baseUrl}#/register-volunteer/${uuid}`;
    navigator.clipboard.writeText(fullLink);
    toast({ title: "تم نسخ الرابط بنجاح 📋" });
  };

  return (
    <AppLayout title="إدارة الشباب وتنمية التطوع">
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-700 p-6 text-white shadow-md">
          <h2 className="text-2xl font-bold">الإدارة المركزية لشؤون التطوع</h2>
          <p className="text-red-100 text-sm mt-1">نظام الربط المتكامل والمطابق لكافة الجداول بمرونة فائقة.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
        ) : requests.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">لا توجد طلبات إمداد مقدمة حالياً في قاعدة البيانات.</Card>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-muted text-muted-foreground text-sm font-bold border-b border-border">
                  <th className="p-4">المهمة المطلوبة</th>
                  <th className="p-4">العدد المطلوب</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((req) => {
                  return (
                    <tr key={req.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-bold">
                        {req.role_title}
                        {req.isLegacy && <span className="mr-2 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">طلب سابق</span>}
                      </td>
                      <td className="p-4 font-mono text-red-600 font-bold">{req.required_count} متطوع</td>
                      <td className="p-4">
                        <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium border border-green-200">
                          {req.status === "approved" ? "مقبول / تم توليد الرابط" : "في الانتظار"}
                        </span>
                      </td>
                      <td className="p-4 text-center flex items-center justify-center gap-2">
                        {req.status !== "approved" ? (
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading === req.id} onClick={() => handleCreateLink(req)}>
                            <Link2 className="w-4 h-4 ml-1" /> توليد الرابط
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="border-green-600 text-green-700" onClick={() => copyToClipboard(req.id)}>
                              نسخ الرابط 📋
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="secondary" onClick={() => fetchApplicants(req.id, req.isLegacy)}>
                                  <Eye className="w-4 h-4 ml-1" /> المتقدمين
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
                                <DialogHeader>
                                  <DialogTitle>طلبات المتطوعين لـ {req.role_title}</DialogTitle>
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
                                          <th className="p-2">الحالة</th>
                                          <th className="p-2">التصفية</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {applicants.map((app) => (
                                          <tr key={app.id} className="border-b">
                                            <td className="p-2 font-medium">{app.applicant_data?.fullName || "غير مسجل"}</td>
                                            <td className="p-2 font-mono">{app.applicant_data?.phone || "-"}</td>
                                            <td className="p-2">{app.youth_status}</td>
                                            <td className="p-2 flex gap-1">
                                              <Button size="sm" variant={app.youth_status === 'approved' ? "default" : "outline"} className={app.youth_status === 'approved' ? "bg-green-600 text-white" : ""} onClick={() => handleStatusChange(app.id, 'approved')}>
                                                <Check className="w-3.5 h-3.5" /> قبول
                                              </Button>
                                              <Button size="sm" variant={app.youth_status === 'rejected' ? "destructive" : "outline"} onClick={() => handleStatusChange(app.id, 'rejected')}>
                                                <X className="w-3.5 h-3.5" /> استبعاد
                                              </Button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
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