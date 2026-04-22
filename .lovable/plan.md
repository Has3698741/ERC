
## الهدف
إنشاء **Prompt واحد شامل** يحتوي على كامل بنية الـ Backend والـ Database (Supabase) للمشروع الحالي، بحيث يمكنك استخدامه على نموذج/مشروع آخر وربطه بـ Supabase الخاص بك ليُعيد بناء نفس الهيكل بالكامل.

## ما سيحتويه الـ Prompt
الـ Prompt سيكون ملف واحد منظم يحتوي على:

### 1. نظرة عامة على النظام
- وصف المشروع (نظام إدارة المهام/الاستمارات الإنسانية)
- الـ 8 أدوار (roles) ووظائفها
- دورة حياة الاستمارة (Workflow Lifecycle)

### 2. Enums (الأنواع المخصصة)
- `app_role` (admin, data_manager, operations_room, operations_supervisor, joker, youth_room, department_entry, stakeholder)
- `mission_status` (planned, coded, entered, reviewed, sent_to_youth, monitored)
- `region` (المناطق الجغرافية)
- `mission_type`, `transport_mode`, `change_reason`, `note_type`

### 3. Tables (11 جدول) مع أعمدتها وأنواعها
- `profiles` — بيانات المستخدمين
- `user_roles` — الأدوار (منفصل لمنع privilege escalation)
- `user_dropdown_options` — تخصيص قوائم لكل مستخدم
- `dropdown_options` — القوائم المنسدلة المتحكم بها
- `missions` — الاستمارة الرئيسية
- `mission_drivers` — السائقين والمركبات
- `mission_routes` — نقاط المرور
- `mission_volunteers` — المتطوعين
- `volunteer_notes` — ملاحظات الشباب
- `mission_code_sequences` — تسلسل أكواد المهام لكل فريق
- `audit_log` — سجل التعديلات

### 4. العلاقات بين الجداول (Foreign Keys منطقياً)
رسم توضيحي ASCII يبيّن كيف ترتبط الجداول:
```text
auth.users → profiles, user_roles, user_dropdown_options
missions → mission_drivers, mission_routes, mission_volunteers, volunteer_notes
mission_volunteers → volunteer_notes
dropdown_options → user_dropdown_options
```

### 5. Database Functions (7 دوال)
- `has_role`, `is_admin`, `has_any_role` — فحص الصلاحيات (SECURITY DEFINER)
- `generate_mission_code` — توليد كود المهمة تلقائياً (per-team sequence)
- `touch_updated_at` — تحديث updated_at تلقائياً
- `log_audit` — تسجيل كل تعديل في audit_log
- `handle_new_user` — إنشاء profile وتعيين admin role لـ midololob@gmail.com تلقائياً

### 6. RLS Policies كاملة لكل جدول
لكل جدول ستوضع كل سياسة (SELECT/INSERT/UPDATE/DELETE) كما هي بالضبط.

### 7. Triggers المطلوبة
- `on_auth_user_created` على `auth.users`
- `touch_updated_at` على missions, profiles, mission_volunteers
- `log_audit` على missions و mission_volunteers

### 8. Workflow / Status Lifecycle
شرح تفصيلي لدورة الحالة:
```text
coded → entered → reviewed → sent_to_youth → monitored
(الفريق) (العمليات) (الجوكر) (الشباب) (المشرف-اعتماد)
```
مع تسميات الواجهة بالعربية لكل حالة.

### 9. Auth Configuration
- Email/Password authentication
- Google OAuth (اختياري)
- Auto-confirm: مفعّل
- Admin bootstrap: midololob@gmail.com يتم تعيينه admin تلقائياً عند التسجيل

### 10. ملاحظات تنفيذية مهمة
- لا تستخدم FK إلى auth.users
- الأدوار في جدول منفصل (user_roles) لا في profiles
- استخدم `SECURITY DEFINER` لدوال فحص الأدوار
- استخدم `search_path = public` في كل الدوال

## طريقة التسليم
سأقوم بإنشاء ملف **`SYSTEM_PROMPT.md`** في `/mnt/documents/` يحتوي على كل ما سبق بصيغة جاهزة للنسخ، بحيث يمكنك:
1. لصقه مباشرة في أي أداة AI (Lovable / Cursor / Claude / ChatGPT)
2. ربطه بمشروع Supabase جديد ليُعيد بناء نفس الـ schema بالكامل

سيتم تقديم الملف كـ **artifact قابل للتحميل** بصيغة Markdown.

## الخطوات التنفيذية
1. قراءة كامل ملفات الـ migrations الحالية للتأكد من دقة الـ SQL
2. قراءة `src/lib/constants.ts` لاستخراج تسميات الحالات والأدوار النهائية
3. توليد ملف `SYSTEM_PROMPT.md` شامل ومنظم
4. تقديمه كـ artifact
