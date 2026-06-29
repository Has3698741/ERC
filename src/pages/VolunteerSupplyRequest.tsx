import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NewVolunteerRequest() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Form States
  const [departmentCode, setDepartmentCode] = useState(profile?.department_code || "");
  const [roleName, setRoleName] = useState("");
  const [volCount, setVolCount] = useState<number>(1);
  const [startDate, setStartDate] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState("");
  const [duties, setDuties] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [skills, setSkills] = useState("");
  const [shift, setShift] = useState("صباحية");
  const [travelRequired, setTravelRequired] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    try {
      // إرسال البيانات بأسماء الأعمدة المطابقة تماماً لجدول الـ SQL الذي أنشأته
      const { error } = await supabase.from("volunteer_supply_requests").insert({
        created_by: user.id,
        department_code: departmentCode,
        request_date: new Date().toISOString().split('T')[0],
        role_name: roleName,
        vol_count: volCount,
        start_date: startDate,
        hours_needed: hoursNeeded,
        duties: duties,
        qualifications: qualifications,
        skills: skills,
        shift: shift,
        travel_required: travelRequired,
        status: "pending_youth"
      });

      if (error) throw error;
      
      toast.success("تم إرسال طلب الإمداد بنجاح إلى إدارة الشباب");
      navigate("/dashboard");
    } catch (e: any) {
      console.error("Supabase Error:", e);
      toast.error("فشل إرسال الطلب: " + (e.message || "حدث خطأ غير متوقع"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout title="طلب إمداد جديد بالمتطوعين">
      <div className="max-w-3xl mx-auto py-6">
        <Card className="p-6 md:p-8 shadow-sm">
          <div className="mb-6 border-b pb-4">
            <h3 className="font-bold text-xl text-primary">نموذج طلب إمداد بمتطوعين</h3>
            <p className="text-sm text-muted-foreground mt-1">يُرجى ملء البيانات بدقة لإرسال طلبك لإدارة الشباب</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>الإدارة الطالبة</Label>
                <Input value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>مسمى الدور / المهمة *</Label>
                <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>عدد المتطوعين المطلوب *</Label>
                <Input type="number" min={1} value={volCount} onChange={(e) => setVolCount(Number(e.target.value))} required />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ البداية *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>المسؤوليات والواجبات</Label>
              <Textarea value={duties} onChange={(e) => setDuties(e.target.value)} rows={3} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>المؤهلات المطلوبة</Label>
                <Input value={qualifications} onChange={(e) => setQualifications(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>المهارات المطلوبة</Label>
                <Input value={skills} onChange={(e) => setSkills(e.target.value)} />
              </div>
            </div>

            <div className="p-4 bg-muted/30 rounded-xl space-y-4">
              <h4 className="font-bold text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> تفاصيل إضافية</h4>
              <div className="flex items-center gap-6">
                <div className="space-y-1.5 w-full">
                  <Label>فترة الشفت</Label>
                  <Select value={shift} onValueChange={setShift}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="صباحية">صباحية</SelectItem>
                      <SelectItem value="مسائية">مسائية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Checkbox id="travel" checked={travelRequired} onCheckedChange={(c) => setTravelRequired(!!c)} />
                  <Label htmlFor="travel">يتطلب سفراً؟</Label>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting ? "جاري الإرسال..." : <><Send className="w-4 h-4 ml-2" /> إرسال الطلب</>}
            </Button>
          </form>
        </Card>
      </div>
    </AppLayout>
  );
}