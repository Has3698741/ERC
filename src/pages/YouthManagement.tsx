import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Copy, CheckCircle2, Clock, Users } from "lucide-react";

interface VolunteerRequest {
  id: string; // تم التعديل إلى string لتناسب الـ UUID
  role_name: string; // الحقل البديل لـ mission_title في جدولك
  department_code: string; // الحقل البديل لـ department_name
  vol_count: number;
  status?: string;
  created_at?: string;
  link_code?: string;
}

export default function YouthManagement() {
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // تغيير اسم الجدول إلى الاسم المعرف في النوع: volunteer_supply_requests
      const { data, error } = await supabase
        .from("volunteer_supply_requests")
        .select(`
          id, role_name, department_code, vol_count, status, created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // بما أن حقل الروابط لم يتم توليد الـ types له بعد، سنقوم بعمل كود محايد لقراءة الحالات
      setRequests(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "خطأ في جلب البيانات",
        description: error.message,
      });
    } finally {
      setLoading(false);
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

      // لتفادي مشاكل الـ Types غير المحدثة للجدول الجديد، نمرر الاسم كـ any صريح مؤقتاً لتخطي الـ Build
      const { error: linkError } = await supabase
        .from("volunteer_supply_requests" as any)
        .update({ status: "link_generated" })
        .eq("id", requestId);

      if (linkError) throw linkError;

      // حفظ الكود في الـ LocalStorage أو في حقل مخصص لتسهيل النسخ الفوري
      localStorage.setItem(`link_${requestId}`, generatedCode);

      toast({
        title: "تم توليد الرابط بنجاح",
        description: "يمكنك الآن نسخ الرابط ومشاركته مع المتطوعين.",
      });

      await fetchRequests();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "فشل توليد الرابط",
        description: error.message,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (requestId: string) => {
    const linkCode = localStorage.getItem(`link_${requestId}`) || `ERC-VOL-${requestId.substring(0, 4)}`;
    const baseUrl = window.location.origin + window.location.pathname;
    const fullLink = `${baseUrl}#/register-volunteer/${linkCode}`;
    
    navigator.clipboard.writeText(fullLink);
    toast({
      title: "تم نسخ الرابط 📋",
      description: "جاهز للإرسال الفوري عبر الواتساب.",
    });
  };

  return (
    <AppLayout title="إدارة الشباب وتنمية التطوع">
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-700 p-6 text-white shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">الإدارة المركزية لشؤون التطوع</h2>
            <p className="text-red-100 text-sm mt-1">توليد روابط الاستمارات الإلكترونية ومتابعة خطط الإمداد الميدانية.</p>
          </div>
          <Users className="w-12 h-12 text-red-200/50 hidden md:block" />
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-red-600" /></div>
        ) : requests.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">لا توجد طلبات إمداد مقدمة حالياً.</Card>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-muted text-muted-foreground text-sm font-bold border-b border-border">
                  <th className="p-4">المهمة المطلوبة</th>
                  <th className="p-4">كود الإدارة</th>
                  <th className="p-4">العدد المطلوب</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((req) => {
                  const hasLink = req.status === "link_generated" || localStorage.getItem(`link_${req.id}`);
                  return (
                    <tr key={req.id} className="hover:bg-muted/50 transition-colors">
                      <td className="p-4 font-bold">{req.role_name}</td>
                      <td className="p-4 text-muted-foreground">{req.department_code}</td>
                      <td className="p-4 font-mono text-red-600 font-bold">{req.vol_count} متطوع</td>
                      <td className="p-4">
                        {!hasLink ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-medium border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> في الانتظار
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium border border-green-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> تم نشر الرابط
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {!hasLink ? (
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
                            disabled={actionLoading === req.id}
                            onClick={() => handleCreateLink(req.id)}
                          >
                            {actionLoading === req.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Link2 className="w-4 h-4" /> توليد رابط التسجيل
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-600 text-green-700 hover:bg-green-50 gap-1.5"
                            onClick={() => copyToClipboard(req.id)}
                          >
                            <Copy className="w-4 h-4" /> نسخ الرابط 📋
                        </Button>
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