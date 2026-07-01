import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, FileText, UserCheck, Users } from "lucide-react";

interface SupplyRequest {
  id: string;
  role_name: string;
  department_code: string;
  vol_count: number;
  status: string;
}

interface VolunteerApplicant {
  id: string;
  form_id: string;
  applicant_data: {
    full_name?: string;
    phone?: string;
    email?: string;
    cv_url?: string;
    skills?: string;
    rejection_reason?: string; // حفظ سبب الرفض بالداخل أو تحديثه
  };
  youth_status: string;
  management_status: string; // تم تعديلها لتطابق عمود الجدول الفعلي
}

export default function DepartmentInterviews() {
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequest | null>(null);
  const [applicants, setApplicants] = useState<VolunteerApplicant[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  // States لـ Modal الرفض
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => {
    fetchActiveRequests();
  }, []);

  // 1. جلب طلبات الإمداد المحولة للمقابلات
  const fetchActiveRequests = async () => {
    try {
      setLoadingRequests(true);
      const { data, error } = await supabase
        .from("volunteer_supply_requests")
        .select("id, role_name, department_code, vol_count, status")
        .eq("status", "sent_to_interviews");

      if (error) throw error;
      setRequests((data as unknown as SupplyRequest[]) || []);
    } catch (error: any) {
      toast.error("خطأ في جلب الطلبات: " + error.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  // 2. جلب المتقدمين بناءً على الـ Form المرتبط بالطلب والـ youth_status
 // 2. جلب المتقدمين بناءً على الـ Form المرتبط بالطلب والـ youth_status
  const fetchApplicants = async (requestId: string) => {
    try {
      setLoadingApplicants(true);

      // أولاً: نجيب الـ form_id الخاص بالطلب من جدول supply_request_forms مع تحويل النتيجة لـ any لمنع أخطاء الـ Relationships
      const { data, error: formError } = await supabase
        .from("supply_request_forms" as any)
        .select("id")
        .eq("request_id", requestId)
        .maybeSingle();

      if (formError) throw formError;
      
      const formData = data as any; // هنا تم التحويل الآمن لمنع خطأ الـ Property 'id' does not exist
      if (!formData || !formData.id) {
        setApplicants([]);
        return;
      }

      // ثانياً: نجيب الطلبات المرشحة (short_listed) من جدول supply_request_applications
      const { data: appsData, error } = await supabase
        .from("supply_request_applications" as any)
        .select("id, form_id, applicant_data, youth_status, management_status")
        .eq("form_id", formData.id)
        .eq("youth_status", "short_listed"); 

      if (error) throw error;
      setApplicants((appsData as unknown as VolunteerApplicant[]) || []);
    } catch (error: any) {
      toast.error("خطأ في جلب المتطوعين: " + error.message);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleSelectRequest = (request: SupplyRequest) => {
    setSelectedRequest(request);
    fetchApplicants(request.id);
  };

  // 3. قبول المتطوع في المقابلة (تحديث management_status)
  const handleAccept = async (applicantId: string) => {
    try {
      const { error } = await supabase
        .from("supply_request_applications" as any)
        .update({ management_status: "accepted" } as any)
        .eq("id", applicantId);

      if (error) throw error;

      toast.success("تم تسجيل قبول المتطوع بنجاح");
      if (selectedRequest) fetchApplicants(selectedRequest.id);
    } catch (error: any) {
      toast.error("فشل تسجيل القرار: " + error.message);
    }
  };

  // 4. فتح نافذة الرفض لتسجيل السبب
  const openRejectDialog = (applicantId: string) => {
    setSelectedApplicantId(applicantId);
    setRejectionReason("");
    setIsRejectDialogOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      toast.error("يرجى كتابة سبب الرفض أولاً");
      return;
    }
    if (!selectedApplicantId) return;

    setSubmittingDecision(true);
    try {
      // جلب البيانات الحالية لتحديث الـ jsonb وإضافة سبب الرفض بداخله بشكل آمن
      const currentApplicant = applicants.find(a => a.id === selectedApplicantId);
      const updatedData = {
        ...(currentApplicant?.applicant_data || {}),
        rejection_reason: rejectionReason.trim()
      };

      const { error } = await supabase
        .from("supply_request_applications" as any)
        .update({
          management_status: "rejected",
          applicant_data: updatedData
        } as any)
        .eq("id", selectedApplicantId);

      if (error) throw error;

      toast.success("تم تسجيل الرفض وإرسال النتيجة لإدارة الشباب");
      setIsRejectDialogOpen(false);
      if (selectedRequest) fetchApplicants(selectedRequest.id);
    } catch (error: any) {
      toast.error("فشل تسجيل الرفض: " + error.message);
    } finally {
      setSubmittingDecision(false);
    }
  };

  return (
    <AppLayout title="إدارة المقابلات والاختيار">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-6 max-w-7xl mx-auto px-4">
        
        {/* القسم الأيمن */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-bold text-lg text-primary flex items-center gap-2">
            <Users className="w-5 h-5" /> طلبات قيد المقابلة
          </h3>
          {loadingRequests ? (
            <p className="text-sm text-muted-foreground">جاري تحميل الطلبات...</p>
          ) : requests.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground border-dashed">
              لا توجد طلبات محولة للمقابلات حالياً.
            </Card>
          ) : (
            requests.map((req) => (
              <Card 
                key={req.id} 
                className={`p-4 cursor-pointer transition-all border ${selectedRequest?.id === req.id ? 'border-red-600 bg-red-50/20 shadow-sm' : 'hover:bg-muted/50'}`}
                onClick={() => handleSelectRequest(req)}
              >
                <div className="font-bold text-base text-foreground mb-1">{req.role_name}</div>
                <div className="text-xs text-muted-foreground flex justify-between items-center mt-2">
                  <span>كود الإدارة: {req.department_code}</span>
                  <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">العدد: {req.vol_count}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* القسم الأيسر */}
        <div className="lg:col-span-2 space-y-4">
          {selectedRequest ? (
            <>
              <div className="flex justify-between items-center bg-muted/30 p-4 rounded-xl border">
                <div>
                  <h4 className="font-bold text-base text-primary">{selectedRequest.role_name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">مراجعة المرشحين ورصد التقييم النهائي</p>
                </div>
                <Badge className="bg-amber-500 text-white">مرحلة المقابلات</Badge>
              </div>

              {loadingApplicants ? (
                <p className="text-sm text-muted-foreground">جاري تحميل قائمة المتطوعين...</p>
              ) : applicants.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted-foreground border-dashed">
                  لم يتم العثور على متطوعين مرشحين من إدارة الشباب لهذا الطلب.
                </Card>
              ) : (
                <Card className="overflow-hidden border shadow-sm">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="text-right">الاسم بالكامل</TableHead>
                        <TableHead className="text-right">المهارات</TableHead>
                        <TableHead className="text-center">الـ CV</TableHead>
                        <TableHead className="text-center">الحالة</TableHead>
                        <TableHead className="text-left">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {applicants.map((applicant) => (
                        <TableRow key={applicant.id}>
                          <TableCell className="font-medium">
                            <div>{applicant.applicant_data?.full_name || "بدون اسم"}</div>
                            <div className="text-xs text-muted-foreground">{applicant.applicant_data?.phone || "-"}</div>
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate text-xs">
                            {applicant.applicant_data?.skills || "لا يوجد"}
                          </TableCell>
                          <TableCell className="text-center">
                            {applicant.applicant_data?.cv_url ? (
                              <Button variant="ghost" size="icon" onClick={() => window.open(applicant.applicant_data.cv_url, "_blank")}>
                                <FileText className="w-4 h-4 text-blue-600" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {applicant.management_status === "accepted" && <Badge className="bg-emerald-600 text-white">مقبول</Badge>}
                            {applicant.management_status === "rejected" && (
                              <div className="space-y-1">
                                <Badge variant="destructive" className="bg-red-600">مرفوض</Badge>
                                <div className="text-[10px] text-muted-foreground max-w-[100px] truncate" title={applicant.applicant_data?.rejection_reason}>
                                  السبب: {applicant.applicant_data?.rejection_reason}
                                </div>
                              </div>
                            )}
                            {applicant.management_status === "pending" && <Badge variant="secondary">مُعلق</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                                disabled={applicant.management_status === "accepted"}
                                onClick={() => handleAccept(applicant.id)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 border-red-200"
                                disabled={applicant.management_status === "rejected"}
                                onClick={() => openRejectDialog(applicant.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          ) : (
            <Card className="h-64 flex flex-col items-center justify-center text-center p-6 border-dashed">
              <UserCheck className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <h4 className="font-bold text-base text-foreground mb-1">يرجى اختيار طلب إمداد</h4>
              <p className="text-xs text-muted-foreground max-w-xs">اختر أحد الطلبات النشطة من القائمة اليمنى لعرض المتطوعين المرشحين للمقابلة لاتخاذ الإجراءات.</p>
            </Card>
          )}
        </div>
      </div>

      {/* نافذة إدخال سبب الرفض */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-red-600">تسجيل سبب رفض المتطوع</DialogTitle>
            <DialogDescription className="text-right text-xs">
              يجب تدوين سبب الرفض بدقة ليتمكن زملاؤنا في إدارة الشباب من مراجعته واعتماده.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reason" className="text-right block font-semibold">سبب الرفض *</Label>
            <Textarea 
              id="reason" 
              placeholder="اكتب سبب عدم قبول المتطوع في المقابلة الشخصية للفعالية..." 
              value={rejectionReason} 
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="text-right"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>إلغاء</Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleRejectSubmit} disabled={submittingDecision}>
              {submittingDecision ? "جاري الحفظ..." : "تأكيد الرفض والإرسال"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}