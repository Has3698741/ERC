import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Eye, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface VolunteerRequest {
  id: string;
  role_name: string;      // مطابقة لـ DDL الفعلي
  vol_count: number;      // مطابقة لـ DDL الفعلي
  status: string;
  created_at?: string;
}

interface Applicant {
  id: string;
  form_id: string;
  applicant_data: {
    full_name?: string;   // مطابقة للهيكل الداخلي للـ jsonb المتفق عليه في شاشة المقابلات
    phone?: string;
    email?: string;
    skills?: string;
    cv_url?: string;
  };
  youth_status: string;
}

export default function YouthManagement() {
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // القراءة المباشرة والصحيحة بحسب أعمدة الجدول الفعلي الحالية
      const { data, error } = await supabase
        .from("volunteer_supply_requests" as any)
        .select(`id, role_name, vol_count, status, created_at`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase Schema Error:", error.message);
        setRequests([]);
        return;
      }

      setRequests((data as unknown as VolunteerRequest[]) || []);
    } catch (error: any) {
      console.error("Catch Error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async (requestId: string) => {
    try {
      setApplicantsLoading(true);
      
      // جلب الـ form_id المرتبط بالطلب من جدول supply_request_forms الفعلي
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

      // جلب المتقدمين بناءً على اسم الجدول الفعلي الصحيح supply_request_applications
      const { data: appData, error: appError } = await supabase
        .from("supply_request_applications" as any)
        .select("id, form_id, applicant_data, youth_status")
        .eq("form_id", formData.id);

      if (appError) throw appError;
      
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

      // إدراج السجل في جدول النماذج الفعلي والمطابق للـ DDL
      const { error: linkError } = await supabase
        .from("supply_request_forms" as any)
        .insert([{ request_id: req.id, public_link_uuid: generatedUuid, is_active: true, created_by: (await supabase.auth.getUser()).data.user?.id }]);

      if (linkError) throw linkError;

      // تحديث حالة الطلب إلى مرسل للمقابلات ليظهر في شاشة المقابلات تلقائياً
      const { error: updateError } = await supabase
        .from("volunteer_supply_requests" as any)
        .update({ status: "sent_to_interviews" }) // الحالة المعتمدة لنقل الطلب لشاشة المقابلات
        .eq("id", req.id);

      if (updateError) throw updateError;

      localStorage.setItem(`form_uuid_${req.id}`, generatedUuid);
      toast({ title: "تم توليد رابط الاستمارة وبدء الفرز بنجاح" });
      await fetchRequests();
    } catch (error: any) {
      toast({ variant: "destructive", title: "فشل توليد الرابط", description: error.message });
    } finally {
      setActionLoading(null);
    }
  };

  // تغيير حالة الفرز الداخلي لإدارة الشباب (تحويل المتقدمين إلى القائمة المختصرة للمقابلات)
  const handleStatusChange = async (applicantId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("supply_request_applications" as any)
        .update({ youth_status: newStatus })
        .eq("id", applicantId);

      if (error) throw error;

      toast({ title: `تم تحديث حالة الفرز إلى [${newStatus === 'short_listed' ? 'مرشح للمقابلة' : 'مستبعد'}]` });
      if (selectedFormId) {
        const { data } = await supabase.from("supply_request_applications" as any).select("id, form_id, applicant_data, youth_status").eq("form_id", selectedFormId);
        setApplicants((data as unknown) as Applicant[]);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "فشل التحديث", description: error.message });
    }
  };

  const copyToClipboard = (requestId: string) => {
    const uuid = localStorage.getItem(`form_uuid_${requestId}`) || requestId;
    const baseUrl = window.location.origin + window.location.pathname;
    const fullLink = `${baseUrl}#/register-volunteer/${uuid}`;
    navigator.clipboard.writeText(fullLink);
    toast({ title: "تم نسخ رابط التقديم بنجاح 📋" });
  };

  return (
    <AppLayout title="إدارة الشباب وتنمية التطوع">
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-4">
        <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-700 p-6 text-white shadow-md">
          <h2 className="text-2xl font-bold">الإدارة المركزية لشؤون التطوع</h2>
          <p className="text-red-100 text-sm mt-1">نظام فرز المتقدمين وتوليد روابط الاستمارات الإلكترونية المربوطة بالمنظومة.</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
        ) : requests.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground border-dashed">لا توجد طلبات إمداد مقدمة حالياً في قاعدة البيانات.</Card>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-sm font-bold border-b border-border">
                  <th className="p-4">المهمة المطلوبة</th>
                  <th className="p-4">العدد المطلوب</th>
                  <th className="p-4">الحالة للطلب</th>
                  <th className="p-4 text-center">الإجراءات والفرز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((req) => {
                  const isApproved = req.status === "sent_to_interviews" || req.status === "approved";
                  return (
                    <tr key={req.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-bold text-foreground">
                        {req.role_name}
                      </td>
                      <td className="p-4 font-mono text-red-600 font-bold">{req.vol_count} متطوع</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${isApproved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {isApproved ? "مفتوح للتقديم / المقابلات" : "في انتظار الفرز"}
                        </span>
                      </td>
                      <td className="p-4 text-center flex items-center justify-center gap-2">
                        {!isApproved ? (
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" disabled={actionLoading === req.id} onClick={() => handleCreateLink(req)}>
                            <Link2 className="w-4 h-4 ml-1" /> توليد الرابط وبدء الحملة
                          </Button>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="border-green-600 text-green-700 hover:bg-green-50" onClick={() => copyToClipboard(req.id)}>
                              نسخ الرابط 📋
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="secondary" onClick={() => fetchApplicants(req.id)}>
                                  <Eye className="w-4 h-4 ml-1" /> فرز المتقدمين
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
                                <DialogHeader>
                                  <DialogTitle className="text-right text-primary">طلبات المتطوعين لـ {req.role_name}</DialogTitle>
                                </DialogHeader>
                                {applicantsLoading ? (
                                  <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-red-600" /></div>
                                ) : applicants.length === 0 ? (
                                  <p className="text-center text-muted-foreground p-4">لا يوجد متقدمين حتى الآن عبر هذا الرابط الببليك.</p>
                                ) : (
                                  <div className="space-y-4 mt-4">
                                    <table className="w-full text-right text-sm">
                                      <thead>
                                        <tr className="border-b font-bold text-muted-foreground bg-muted/30">
                                          <th className="p-3">الاسم الثنائي/الكامل</th>
                                          <th className="p-3">رقم الهاتف</th>
                                          <th className="p-3">حالة فرز الشباب</th>
                                          <th className="p-3 text-left">إجراء الترشيح للمقابلة</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {applicants.map((app) => (
                                          <tr key={app.id} className="border-b hover:bg-muted/30">
                                            <td className="p-3 font-medium">{app.applicant_data?.full_name || "غير مسجل"}</td>
                                            <td className="p-3 font-mono">{app.applicant_data?.phone || "-"}</td>
                                            <td className="p-3">
                                              {app.youth_status === 'short_listed' && <span className="text-emerald-600 font-semibold">مرشح للمقابلات</span>}
                                              {app.youth_status === 'rejected' && <span className="text-red-500">مستبعد</span>}
                                              {app.youth_status === 'pending' && <span className="text-muted-foreground">قيد الفرز المبدئي</span>}
                                            </td>
                                            <td className="p-3 flex gap-1 justify-end">
                                              <Button 
                                                size="sm" 
                                                variant={app.youth_status === 'short_listed' ? "default" : "outline"} 
                                                className={app.youth_status === 'short_listed' ? "bg-green-600 text-white hover:bg-green-700" : "text-green-600 border-green-200 hover:bg-green-5"} 
                                                onClick={() => handleStatusChange(app.id, 'short_listed')}
                                              >
                                                <Check className="w-3.5 h-3.5 ml-0.5" /> ترشيح للمقابلة
                                              </Button>
                                              <Button 
                                                size="sm" 
                                                variant={app.youth_status === 'rejected' ? "destructive" : "outline"} 
                                                onClick={() => handleStatusChange(app.id, 'rejected')}
                                              >
                                                <X className="w-3.5 h-3.5 ml-0.5" /> استبعاد
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