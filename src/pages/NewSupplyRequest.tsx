import React, { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? "",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ""
);
export default function NewSupplyRequest() {
  const [deptId] = useState("1"); 

  const [formData, setFormData] = useState({
    role_name: "",
    vol_count: "",
    start_date: new Date().toISOString().split("T")[0],
    hours_needed: "",
    duties: "",
    qualifications: "",
    skills: "",
    shift: "صباحية",
    requires_travel: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // استخدام types عامة وبسيطة لتفادي مشاكل الـ namespace
  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: any) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.from("volunteer_requests").insert([
        {
          dept_id: deptId,
          request_date: new Date().toISOString().split("T")[0],
          role_name: formData.role_name,
          vol_count: parseInt(formData.vol_count) || 0,
          start_date: formData.start_date,
          hours_needed: formData.hours_needed,
          duties: formData.duties,
          qualifications: formData.qualifications,
          skills: formData.skills,
          shift: formData.shift,
          requires_travel: formData.requires_travel,
          status: "pending",
        },
      ]);

      if (error) throw error;

      setMessage({ type: "success", text: "تم إرسال طلب المدد بنجاح وجاري مراجعته من قبل الإدارة." });
      setFormData({
        role_name: "",
        vol_count: "",
        start_date: new Date().toISOString().split("T")[0],
        hours_needed: "",
        duties: "",
        qualifications: "",
        skills: "",
        shift: "صباحية",
        requires_travel: false,
      });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 text-right" style={{ direction: "rtl" }}>
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* الهيدر */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white flex justify-between items-center shadow-md">
          <div>
            <h1 className="text-2xl font-bold tracking-wide">الهلال الأحمر المصري</h1>
            <p className="text-red-100 text-sm mt-1">نموذج طلب إمداد بمتطوعين (نظام إدارة المتطوعين)</p>
          </div>
          <div className="bg-white p-2 rounded-full shadow-inner">
            <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center font-bold text-xl text-white">
              ERC
            </div>
          </div>
        </div>

        <div className="p-8">
          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
              message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">👤 مسمى الدور / المهمة</label>
                <input
                  type="text"
                  name="role_name"
                  required
                  value={formData.role_name}
                  onChange={handleChange}
                  placeholder="مثلاً: متطوع خدمات صحية"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-black outline-none bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">👥 العدد المطلوب</label>
                <input
                  type="number"
                  name="vol_count"
                  required
                  min="1"
                  value={formData.vol_count}
                  onChange={handleChange}
                  placeholder="أدخل عدد المتطوعين"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-black outline-none bg-gray-50/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">📅 تاريخ البداية</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-black outline-none bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">⏱️ الساعات المطلوبة</label>
                <input
                  type="text"
                  name="hours_needed"
                  value={formData.hours_needed}
                  onChange={handleChange}
                  placeholder="مثال: 5 ساعات يومياً"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-black outline-none bg-gray-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📝 قائمة المسؤوليات والواجبات</label>
              <textarea
                name="duties"
                rows={3}
                value={formData.duties}
                onChange={handleChange}
                placeholder="اكتب هنا تفاصيل المهام..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-black outline-none bg-gray-50/50 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">🎓 المؤهلات المطلوبة</label>
                <input
                  type="text"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-black outline-none bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">⭐ المهارات المطلوبة</label>
                <input
                  type="text"
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-red-500 text-black outline-none bg-gray-50/50"
                />
              </div>
            </div>

            <div className="bg-red-50/40 border border-red-100 rounded-xl p-5 my-6">
              <h3 className="text-sm font-bold text-red-800 mb-4">📋 تفاصيل فترة العمل واللوجستيات</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-2">الفترة الزمنية</label>
                  <select
                    name="shift"
                    value={formData.shift}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-black text-sm"
                  >
                    <option value="صباحية">صباحية</option>
                    <option value="مسائية">مسائية</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-4 sm:pt-0">
                  <input
                    type="checkbox"
                    id="requires_travel"
                    name="requires_travel"
                    checked={formData.requires_travel}
                    onChange={handleCheckboxChange}
                    className="w-5 h-5 text-red-600 border-gray-300 rounded"
                  />
                  <label htmlFor="requires_travel" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    هل يتطلب العمل سفراً أو مبيتاً خارج المحافظة؟
                  </label>
                </div>
              </div>
            </div>

            <div className="text-center pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-10 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 text-lg"
              >
                {loading ? "جاري إرسال الطلب..." : "إرسال الطلب للأدمن"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}