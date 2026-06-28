import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2, Copy, CheckCircle2, Clock, Users } from "lucide-react";

interface VolunteerRequest {
  id: number;
  mission_title: string;
  department_name: string;
  vol_count: number;
  skills: string;
  status: string;
  created_at: string;
  link_code?: string;
}

export default function YouthManagement() {
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("volunteer_requests")
        .select(`
          id, mission_title, department_name, vol_count, skills, status, created_at,
          supply_request_links ( link_code )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((req: any) => ({
        ...req,
        link_code: req.supply_request_links?.[0]?.link_code,
      })) || [];

      setRequests(formattedData);
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

  const handleCreateLink = async (requestId: number) => {
    try {
      setActionLoading(requestId);
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const generatedCode = `ERC-VOL-${requestId}-${randomId}`;

      const { error: linkError } = await supabase
        .from("supply_request_links")
        .insert([{ request_id: requestId, link_code: generatedCode }]);

      if (linkError) throw linkError;

      const { error: updateError } = await supabase
        .from("volunteer_requests")
        .update({ status: "link_generated" })
        .eq("id", requestId);

      if (updateError) throw updateError;

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

  const copyToClipboard = (linkCode: string) => {
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
                  <th className="p-4">اسم المهمة</th>
                  <th className="p-4">الإدارة الطالبة</th>
                  <th className="p-4">العدد المطلوب</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/50 transition-colors">
                    <td className="p-4 font-bold">{req.mission_title}</td>
                    <td className="p-4 text-muted-foreground">{req.department_name || "الإدارة الميدانية"}</td>
                    <td className="p-4 font-mono text-red-600 font-bold">{req.vol_count} متطوع</td>
                    <td className="p-4">
                      {req.status === "pending_youth" ? (
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
                      {req.status === "pending_youth" ? (
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
                          onClick={() => copyToClipboard(req.link_code || "")}
                        >
                          <Copy className="w-4 h-4" /> نسخ الرابط 📋
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}