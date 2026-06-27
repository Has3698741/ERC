import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  UserPlus, FileText, Plus, Trash2, Send, Clock, 
  Check, X, FileSpreadsheet, Eye, ArrowRight, CheckCircle, 
  AlertCircle, Calendar, Users, Briefcase
} from "lucide-react";

interface ProposedVolunteer {
  full_name: string;
  membership_number: string;
  cv_url?: string;
  interview_status: "pending" | "accepted" | "rejected";
  interview_notes?: string;
}

interface VolunteerRequest {
  id: string;
  created_by: string;
  department_code: string;
  request_date: string;
  role_name: string;
  vol_count: number;
  start_date: string;
  hours_needed: string;
  duties: string;
  qualifications: string;
  skills: string;
  shift: string;
  travel_required: boolean;
  status: "pending_youth" | "proposed_by_youth" | "interviews_in_progress" | "interviews_submitted" | "approved" | "rejected";
  youth_notes: string | null;
  proposed_volunteers: ProposedVolunteer[];
  created_at: string;
}

const SUPPLY_STATUS_LABELS: Record<string, string> = {
  pending_youth: "انتظار إدارة الشباب",
  proposed_by_youth: "مُرشحين من الشباب",
  interviews_in_progress: "المقابلات جارية",
  interviews_submitted: "تم إرسال المقابلات",
  approved: "مقبول ومعتمد",
  rejected: "مرفوض"
};

const SUPPLY_STATUS_COLORS: Record<string, string> = {
  pending_youth: "bg-warning/15 text-warning border-warning/20",
  proposed_by_youth: "bg-info/15 text-info border-info/20",
  interviews_in_progress: "bg-primary/15 text-primary border-primary/20",
  interviews_submitted: "bg-purple-500/15 text-purple-600 border-purple-500/20",
  approved: "bg-success/15 text-success border-success/20",
  rejected: "bg-destructive/15 text-destructive border-destructive/20"
};

export default function VolunteerSupplyRequest() {
  const { user, profile, roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const isYouthRoom = roles.includes("youth_room") || isAdmin;

  // View state: 'list' | 'create' | 'detail'
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [requests, setRequests] = useState<VolunteerRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<VolunteerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [departmentCode, setDepartmentCode] = useState("");
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [roleName, setRoleName] = useState("");
  const [volCount, setVolCount] = useState<number>(1);
  const [startDate, setStartDate] = useState("");
  const [hoursNeeded, setHoursNeeded] = useState("");
  const [duties, setDuties] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [skills, setSkills] = useState("");
  const [shift, setShift] = useState("صباحية");
  const [travelRequired, setTravelRequired] = useState(false);

  // Youth Actions Fields
  const [youthNotes, setYouthNotes] = useState("");
  const [proposedVols, setProposedVols] = useState<ProposedVolunteer[]>([
    { full_name: "", membership_number: "", cv_url: "", interview_status: "pending", interview_notes: "" }
  ]);

  useEffect(() => {
    if (profile) {
      setDepartmentCode(profile.department_code || profile.team_code || "");
    }
    fetchRequests();
  }, [profile, user]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from("volunteer_supply_requests").select("*").order("created_at", { ascending: false });
      
      if (!isYouthRoom) {
        query = query.eq("created_by", user.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      setRequests((data || []) as unknown as VolunteerRequest[]);
    } catch (e: any) {
      toast.error("فشل في تحميل الطلبات: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!roleName.trim()) { toast.error("يرجى إدخال مسمى الدور / المهمة"); return; }
    if (volCount <= 0) { toast.error("يرجى إدخال عدد متطوعين صالح"); return; }
    if (!startDate) { toast.error("يرجى تحديد تاريخ البداية"); return; }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("volunteer_supply_requests").insert({
        created_by: user.id,
        department_code: departmentCode || "غير محدد",
        request_date: requestDate,
        role_name: roleName,
        vol_count: volCount,
        start_date: startDate,
        hours_needed: hoursNeeded,
        duties,
        qualifications,
        skills,
        shift,
        travel_required: travelRequired,
        status: "pending_youth"
      });

      if (error) throw error;
      toast.success("تم إرسال طلب الإمداد بالمتطوعين بنجاح إلى إدارة الشباب");
      setView('list');
      
      // Reset form
      setRoleName("");
      setVolCount(1);
      setStartDate("");
      setHoursNeeded("");
      setDuties("");
      setQualifications("");
      setSkills("");
      setShift("صباحية");
      setTravelRequired(false);
      fetchRequests();
    } catch (e: any) {
      toast.error("فشل إرسال الطلب: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddProposedVolRow = () => {
    setProposedVols([...proposedVols, { full_name: "", membership_number: "", cv_url: "", interview_status: "pending", interview_notes: "" }]);
  };

  const handleRemoveProposedVolRow = (idx: number) => {
    setProposedVols(proposedVols.filter((_, i) => i !== idx));
  };

  const handleUpdateProposedVol = (idx: number, field: keyof ProposedVolunteer, val: any) => {
    setProposedVols(proposedVols.map((v, i) => i === idx ? { ...v, [field]: val } : v));
  };

  const handleSendProposedVolunteers = async () => {
    if (!selectedRequest) return;
    const validVols = proposedVols.filter(v => v.full_name.trim());
    if (validVols.length === 0) {
      toast.error("يرجى إضافة متطوع واحد على الأقل مع الاسم");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("volunteer_supply_requests")
        .update({
          proposed_volunteers: validVols as unknown as any,
          youth_notes: youthNotes,
          status: "proposed_by_youth"
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;
      toast.success("تم إرسال المتطوعين المقترحين للإدارة الطالبة بنجاح");
      setSelectedRequest(prev => prev ? { ...prev, proposed_volunteers: validVols, youth_notes: youthNotes, status: "proposed_by_youth" } : null);
      fetchRequests();
    } catch (e: any) {
      toast.error("فشل في إرسال المقترحات: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateInterviewStatus = (idx: number, status: "accepted" | "rejected" | "pending") => {
    if (!selectedRequest) return;
    const updatedVols = selectedRequest.proposed_volunteers.map((v, i) => 
      i === idx ? { ...v, interview_status: status } : v
    );
    setSelectedRequest({ ...selectedRequest, proposed_volunteers: updatedVols });
  };

  const handleUpdateInterviewNotes = (idx: number, notes: string) => {
    if (!selectedRequest) return;
    const updatedVols = selectedRequest.proposed_volunteers.map((v, i) => 
      i === idx ? { ...v, interview_notes: notes } : v
    );
    setSelectedRequest({ ...selectedRequest, proposed_volunteers: updatedVols });
  };

  const handleSubmitInterviewResults = async () => {
    if (!selectedRequest) return;
    
    const hasPending = selectedRequest.proposed_volunteers.some(v => v.interview_status === "pending");
    if (hasPending) {
      if (!confirm("بعض المتطوعين لا يزالون معلقين. هل تريد إرسال النتائج على أي حال؟")) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("volunteer_supply_requests")
        .update({
          proposed_volunteers: selectedRequest.proposed_volunteers as unknown as any,
          status: "interviews_submitted"
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;
      toast.success("تم تقديم نتائج المقابلات الشخصية بنجاح لإدارة الشباب");
      setSelectedRequest(prev => prev ? { ...prev, status: "interviews_submitted" } : null);
      fetchRequests();
    } catch (e: any) {
      toast.error("فشل في تقديم النتائج: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalApprove = async () => {
    if (!selectedRequest) return;
    
    setSubmitting(true);
    try {
      const acceptedVols = selectedRequest.proposed_volunteers.filter(v => v.interview_status === "accepted");
      
      if (acceptedVols.length > 0) {
        const volRows = acceptedVols.map(v => ({
          full_name: v.full_name,
          membership_number: v.membership_number || null,
          branch: "المركز العام",
          department_code: selectedRequest.department_code,
          skills: selectedRequest.skills || null,
          qualifications: selectedRequest.qualifications || null
        }));

        const { error: insErr } = await supabase.from("department_volunteers").upsert(
          volRows, 
          { onConflict: "department_code, membership_number" }
        );
        if (insErr) throw insErr;
      }

      const { error: updErr } = await supabase.from("volunteer_supply_requests")
        .update({ status: "approved" })
        .eq("id", selectedRequest.id);
      
      if (updErr) throw updErr;

      toast.success("تم الاعتماد النهائي للطلب وتحديث قاعدة بيانات الإدارة الطالبة");
      setSelectedRequest(prev => prev ? { ...prev, status: "approved" } : null);
      fetchRequests();
    } catch (e: any) {
      toast.error("فشل الاعتماد النهائي: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetail = (req: VolunteerRequest) => {
    setSelectedRequest(req);
    setYouthNotes(req.youth_notes || "");
    if (req.proposed_volunteers && req.proposed_volunteers.length > 0) {
      setProposedVols(req.proposed_volunteers);
    } else {
      setProposedVols([{ full_name: "", membership_number: "", cv_url: "", interview_status: "pending", interview_notes: "" }]);
    }
    setView('detail');
  };

  return (
    <AppLayout title="طلب إمداد جديد بالمتطوعين">
      <div className="space-y-6 max-w-5xl mx-auto">
        
        <div className="flex justify-between items-center border-b border-border pb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">نموذج طلب إمداد بمتطوعين</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {view === 'list' && "قائمة بجميع الطلبات المقدمة ومتابعة حالتها"}
              {view === 'create' && "إنشاء طلب جديد وإرساله لإدارة الشباب والتطوع"}
              {view === 'detail' && `تفاصيل الطلب الخاص بـ ${selectedRequest?.role_name}`}
            </p>
          </div>
          
          <div className="flex gap-2">
            {view !== 'list' && (
              <Button variant="outline" size="sm" onClick={() => setView('list')}>
                <ArrowRight className="w-4 h-4 ml-1.5" /> عودة للقائمة
              </Button>
            )}
            {view === 'list' && !isYouthRoom && (
              <Button size="sm" className="gradient-primary text-white" onClick={() => setView('create')}>
                <Plus className="w-4 h-4 ml-1.5" /> طلب إمداد جديد
              </Button>
            )}
          </div>
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
          <Card className="card-elevated p-6 space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">جاري تحميل الطلبات...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground font-semibold">لا توجد طلبات إمداد مقدمة حالياً</p>
                {!isYouthRoom && (
                  <Button variant="outline" className="mt-2" onClick={() => setView('create')}>
                    أنشئ أول طلب الآن
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>تاريخ الطلب</TableHead>
                      <TableHead>الإدارة الطالبة</TableHead>
                      <TableHead>الدور المطلوب</TableHead>
                      <TableHead className="text-center">العدد</TableHead>
                      <TableHead>تاريخ البداية</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>{req.request_date}</TableCell>
                        <TableCell className="font-semibold text-primary">{req.department_code}</TableCell>
                        <TableCell>{req.role_name}</TableCell>
                        <TableCell className="text-center font-bold">{req.vol_count}</TableCell>
                        <TableCell>{req.start_date}</TableCell>
                        <TableCell>
                          <span className={`status-badge border ${SUPPLY_STATUS_COLORS[req.status] || 'bg-muted text-muted-foreground'}`}>
                            {SUPPLY_STATUS_LABELS[req.status] || req.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => handleOpenDetail(req)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}

        {/* CREATE VIEW */}
        {view === 'create' && (
          <Card className="card-elevated p-6 md:p-8">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
              <div>
                <h3 className="font-bold text-lg text-primary">نموذج طلب إمداد بمتطوعين</h3>
                <p className="text-xs text-muted-foreground">الهلال الأحمر المصري - إدارة الشباب وتنمية التطوع</p>
              </div>
              <div className="bg-red-600 px-3 py-1.5 rounded-full font-bold text-xs text-white">ERC</div>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold">كود الإدارة الطالبة</Label>
                  <Input value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} placeholder="مثال: الإغاثة / الصحة" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold">تاريخ تقديم الطلب</Label>
                  <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="font-bold">مسمى الدور / المهمة *</Label>
                  <Input value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="مثلاً: متطوع خدمات صحية / إغاثة ميدانية" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold">العدد المطلوب *</Label>
                  <Input type="number" min={1} value={volCount} onChange={(e) => setVolCount(Number(e.target.value))} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold">تاريخ البداية *</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold">الساعات المطلوبة</Label>
                  <Input value={hoursNeeded} onChange={(e) => setHoursNeeded(e.target.value)} placeholder="يومياً / أسبوعياً (مثال: 6 ساعات يومياً)" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-bold">قائمة المسؤوليات والواجبات</Label>
                <Textarea value={duties} onChange={(e) => setDuties(e.target.value)} rows={3} placeholder="اكتب المهام التفصيلية للمتطوع هنا..." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="font-bold">المؤهلات المطلوبة</Label>
                  <Input value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="مثال: مؤهل عالي / طالب جامعة" />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-bold">المهارات المطلوبة</Label>
                  <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="مثال: إسعافات أولية / عمل جماعي" />
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> تفاصيل فترة العمل
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="space-y-1.5">
                    <Label className="text-xs">فترة الشفت</Label>
                    <Select value={shift} onValueChange={setShift}>
                      <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="صباحية">صباحية</SelectItem>
                        <SelectItem value="مسائية">مسائية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2 flex items-center space-x-2 space-x-reverse mt-4 md:mt-0">
                    <Checkbox id="travel" checked={travelRequired} onCheckedChange={(checked) => setTravelRequired(!!checked)} />
                    <Label htmlFor="travel" className="font-medium cursor-pointer pr-2">هل يتطلب العمل سفراً أو مبيتاً؟</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setView('list')}>إلغاء</Button>
                <Button type="submit" className="gradient-primary text-white px-8" disabled={submitting}>
                  <Send className="w-4 h-4 ml-2" /> {submitting ? "جاري الإرسال..." : "إرسال الطلب للأدمن"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* DETAIL VIEW */}
        {view === 'detail' && selectedRequest && (
          <div className="space-y-6">
            <Card className="card-elevated p-6 space-y-6">
              <div className="flex justify-between items-start border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">
                      كود الطلب: {selectedRequest.id.substring(0, 8)}
                    </span>
                    <span className={`status-badge border ${SUPPLY_STATUS_COLORS[selectedRequest.status]}`}>
                      {SUPPLY_STATUS_LABELS[selectedRequest.status]}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-primary mt-2">{selectedRequest.role_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">مقدم من: {selectedRequest.department_code} | تاريخ التقديم: {selectedRequest.request_date}</p>
                </div>
                
                <div className="text-left">
                  <div className="text-sm font-bold">العدد المطلوب</div>
                  <div className="text-3xl font-extrabold text-primary">{selectedRequest.vol_count}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="space-y-1">
                  <div className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-4 h-4" /> تاريخ البداية</div>
                  <div className="font-semibold">{selectedRequest.start_date}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-4 h-4" /> الساعات المطلوبة</div>
                  <div className="font-semibold">{selectedRequest.hours_needed || "—"}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-muted-foreground flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> تفاصيل العمل</div>
                  <div className="font-semibold">شفت {selectedRequest.shift} {selectedRequest.travel_required ? "(يتطلب سفراً/مبيتاً)" : ""}</div>
                </div>

                <div className="md:col-span-3 border-t border-border pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 bg-muted/20 p-3 rounded-lg">
                    <div className="text-muted-foreground font-bold">المسؤوليات والواجبات:</div>
                    <div className="whitespace-pre-wrap mt-1">{selectedRequest.duties || "لا توجد"}</div>
                  </div>
                  <div className="space-y-3 bg-muted/20 p-3 rounded-lg">
                    <div>
                      <span className="text-muted-foreground font-bold">المؤهلات المطلوبة:</span>
                      <p className="mt-1">{selectedRequest.qualifications || "لا توجد"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-bold">المهارات المطلوبة:</span>
                      <p className="mt-1">{selectedRequest.skills || "لا توجد"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* YOUTH / ADMIN WORKSPACE */}
            {selectedRequest.status === "pending_youth" && isYouthRoom && (
              <Card className="card-elevated p-6 space-y-5 border-primary/20 bg-primary/5">
                <h3 className="font-bold text-primary flex items-center gap-2">
                  <Users className="w-5 h-5" /> مساحة عمل إدارة الشباب - اقتراح المتطوعين
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="font-bold">ملاحظات إدارة الشباب</Label>
                    <Textarea placeholder="أدخل أي ملاحظات للإدارة الطالبة..." value={youthNotes} onChange={(e) => setYouthNotes(e.target.value)} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="font-bold">قائمة المتطوعين المقترحين للمقابلة</Label>
                      <Button size="sm" variant="outline" onClick={handleAddProposedVolRow}>
                        <Plus className="w-4 h-4 ml-1.5" /> إضافة متطوع مقترح
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {proposedVols.map((v, i) => (
                        <div key={i} className="flex gap-2 items-center p-3 rounded-lg border border-border bg-background">
                          <div className="flex-1">
                            <Input placeholder="الاسم الكامل للمتطوع" value={v.full_name} onChange={(e) => handleUpdateProposedVol(i, "full_name", e.target.value)} />
                          </div>
                          <div className="w-1/4">
                            <Input placeholder="رقم العضوية" value={v.membership_number} onChange={(e) => handleUpdateProposedVol(i, "membership_number", e.target.value)} />
                          </div>
                          <div className="w-1/4">
                            <Input placeholder="رابط الـ CV" value={v.cv_url || ""} onChange={(e) => handleUpdateProposedVol(i, "cv_url", e.target.value)} />
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => handleRemoveProposedVolRow(i)} disabled={proposedVols.length === 1}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button onClick={handleSendProposedVolunteers} className="gradient-primary text-white" disabled={submitting}>
                      <Send className="w-4 h-4 ml-2" /> إرسال البيانات للإدارة الطالبة
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* INTERVIEW WORKSPACE */}
            {selectedRequest.status === "proposed_by_youth" && (
              <Card className="card-elevated p-6 space-y-5 border-info/30 bg-info/5">
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <h3 className="font-bold text-info flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" /> مساحة عمل المقابلات الشخصية وتحديد المقبولين
                  </h3>
                </div>

                {selectedRequest.youth_notes && (
                  <div className="bg-background p-3 rounded-lg border border-border text-sm">
                    <span className="font-bold text-primary">ملاحظات إدارة الشباب: </span>
                    <span>{selectedRequest.youth_notes}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="overflow-x-auto bg-background rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>اسم المتطوع</TableHead>
                          <TableHead>رقم العضوية</TableHead>
                          <TableHead>السيرة الذاتية</TableHead>
                          <TableHead>قرار المقابلة</TableHead>
                          <TableHead>ملاحظات المقابلة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRequest.proposed_volunteers?.map((vol, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-semibold">{vol.full_name}</TableCell>
                            <TableCell>{vol.membership_number || "—"}</TableCell>
                            <TableCell>
                              {vol.cv_url ? (
                                <a href={vol.cv_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">عرض الـ CV</a>
                              ) : "غير مرفق"}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1.5">
                                <Button 
                                  size="sm" 
                                  variant={vol.interview_status === "accepted" ? "default" : "outline"}
                                  className={vol.interview_status === "accepted" ? "bg-success text-white hover:bg-success/90" : ""}
                                  onClick={() => handleUpdateInterviewStatus(idx, "accepted")}
                                >
                                  قبول
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant={vol.interview_status === "rejected" ? "destructive" : "outline"}
                                  onClick={() => handleUpdateInterviewStatus(idx, "rejected")}
                                >
                                  رفض
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input placeholder="ملاحظات..." value={vol.interview_notes || ""} onChange={(e) => handleUpdateInterviewNotes(idx, e.target.value)} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end pt-3">
                    <Button onClick={handleSubmitInterviewResults} className="gradient-primary text-white" disabled={submitting}>
                      <Send className="w-4 h-4 ml-2" /> تقديم نتائج المقابلات نهائياً
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* FINAL APPROVAL FOR YOUTH ROOM */}
            {selectedRequest.status === "interviews_submitted" && isYouthRoom && (
              <Card className="card-elevated p-6 space-y-4 border-purple-500/30 bg-purple-500/5">
                <h3 className="font-bold text-purple-700 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" /> اعتماد الطلب وإضافة المقبولين لقاعدة البيانات
                </h3>
                <p className="text-xs text-muted-foreground">
                  الإدارة الطالبة قامت بإنهاء المقابلات وتحديد المتطوعين المقبولين. اضغط على الزر أدناه لإتمام الطلب رسمياً ونقل المتطوعين لجدول الإدارة الطالبة.
                </p>
                <div className="flex justify-end">
                  <Button onClick={handleFinalApprove} className="bg-purple-600 text-white hover:bg-purple-700" disabled={submitting}>
                    <Check className="w-4 h-4 ml-2" /> اعتماد نهائي وإغلاق الطلب
                  </Button>
                </div>
              </Card>
            )}

          </div>
        )}
      </div>
    </AppLayout>
  );
}