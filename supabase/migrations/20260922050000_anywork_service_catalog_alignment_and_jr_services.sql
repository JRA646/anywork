-- ANYwork service catalog alignment and JR's software/digital services.
-- Keeps the service catalog schema compatible with the admin and public service UIs.

alter table public.anywork_services
  add column if not exists tags jsonb not null default '[]'::jsonb;

alter table public.anywork_services
  add column if not exists image_url text;

delete from public.anywork_services
where id = 'software-general-csaasda-b90d6595';

insert into public.anywork_services
  (id, category, subcategory, title, label, description, icon, items, tags, starting_price, starting_price_label, image_url, enabled)
values
  ('software-full-stack-web-development', 'Software & Digital', 'Web Development', 'Full-Stack Web Development', 'Web Development',
   'End-to-end web applications built from frontend to backend, database, authentication and deployment.',
   'Code2', '["React and Vite frontend","REST API and backend development","Supabase or PostgreSQL integration","Authentication and role-based access","Production deployment"]'::jsonb, '["React","Vite","API","Supabase","PostgreSQL"]'::jsonb, null, 'Quote', null, true),

  ('software-react-frontend-development', 'Software & Digital', 'Web Development', 'React & Frontend Development', 'Frontend Development',
   'Responsive React interfaces for websites, dashboards, portals and internal business applications.',
   'MonitorSmartphone', '["React","Vite","Responsive layouts","Reusable components","Tailwind CSS"]'::jsonb, '["React","Vite","Tailwind","Frontend"]'::jsonb, null, 'Quote', null, true),

  ('software-backend-api-development', 'Software & Digital', 'Backend & API', 'Backend & API Development', 'Backend & API',
   'Secure backend services and APIs that connect web and mobile applications to business data and workflows.',
   'ServerCog', '["REST APIs","Authentication","CRUD workflows","Validation","Third-party integrations"]'::jsonb, '["API","Backend","REST","Integration"]'::jsonb, null, 'Quote', null, true),

  ('software-supabase-database-development', 'Software & Digital', 'Backend & API', 'Supabase & Database Development', 'Database Development',
   'Production-ready Supabase and PostgreSQL solutions including schema design, RLS, functions and reporting queries.',
   'Database', '["PostgreSQL schema design","Row Level Security","SQL functions and RPCs","Indexes and constraints","Reporting queries"]'::jsonb, '["Supabase","PostgreSQL","RLS","SQL"]'::jsonb, null, 'Quote', null, true),

  ('software-dotnet-maui-mobile-development', 'Software & Digital', 'Mobile Development', '.NET MAUI Mobile App Development', 'Mobile App Development',
   'Cross-platform mobile applications for Android and iOS using .NET MAUI with API, camera, barcode and workflow integrations.',
   'Smartphone', '[".NET MAUI","Android and iOS","REST API integration","Camera and barcode features","Offline-aware workflows"]'::jsonb, '[".NET MAUI","Android","iOS","Mobile"]'::jsonb, null, 'Quote', null, true),

  ('software-mobile-api-integration', 'Software & Digital', 'Mobile Development', 'Mobile App API Integration', 'Mobile Integrations',
   'Connect mobile applications to secure APIs, authentication, databases, file uploads and business workflows.',
   'Link2', '["API integration","JWT authentication","File and image uploads","Error handling","Data synchronization"]'::jsonb, '["Mobile","API","JWT","Integration"]'::jsonb, null, 'Quote', null, true),

  ('software-wordpress-development', 'Software & Digital', 'Web & Ecommerce', 'WordPress Development', 'WordPress Websites',
   'Business websites and content-driven WordPress builds with responsive layouts, customization and maintenance.',
   'Globe', '["WordPress setup","Theme customization","Responsive pages","Plugin configuration","Website maintenance"]'::jsonb, '["WordPress","CMS","Website"]'::jsonb, null, 'Quote', null, true),

  ('software-shopify-development', 'Software & Digital', 'Web & Ecommerce', 'Shopify Store Development', 'Shopify Ecommerce',
   'Shopify storefront setup and customization for product, digital-product and service-based businesses.',
   'ShoppingBag', '["Store setup","Theme customization","Product setup","Policy and content pages","Digital delivery setup"]'::jsonb, '["Shopify","Ecommerce","Store"]'::jsonb, null, 'Quote', null, true),

  ('software-admin-dashboard-development', 'Software & Digital', 'Business Systems', 'Admin Dashboard Development', 'Business Dashboards',
   'Role-based admin dashboards for operations, reporting, users, services, workflows and business monitoring.',
   'LayoutDashboard', '["Role-based navigation","Tables and filters","Charts and KPIs","CRUD management","Responsive admin UX"]'::jsonb, '["Dashboard","Admin","CRUD","Reports"]'::jsonb, null, 'Quote', null, true),

  ('software-workflow-automation', 'Software & Digital', 'Automation & Integrations', 'Business Workflow Automation', 'Workflow Automation',
   'Automate repetitive business processes across forms, databases, notifications, approvals and reporting.',
   'Workflow', '["Workflow design","Database automation","Scheduled jobs","Notifications","Approval flows"]'::jsonb, '["Automation","Workflow","Integration"]'::jsonb, null, 'Quote', null, true),

  ('software-google-sheets-reporting-automation', 'Software & Digital', 'Automation & Integrations', 'Google Sheets & Reporting Automation', 'Google Sheets Automation',
   'Automated Google Sheets workflows for attendance, operational reports, dashboards and recurring summaries.',
   'Table2', '["Google Sheets integration","Apps Script","Formula automation","Data mapping","Scheduled reporting"]'::jsonb, '["Google Sheets","Apps Script","Reporting"]'::jsonb, null, 'Quote', null, true),

  ('software-google-slides-reporting-automation', 'Software & Digital', 'Automation & Integrations', 'Google Slides Report Automation', 'Presentation Automation',
   'Generate presentation-ready reports from structured data with automated dates, totals, charts and weekly summaries.',
   'Presentation', '["Google Slides templates","Dynamic values","Weekly report generation","Charts and totals","Automated date ranges"]'::jsonb, '["Google Slides","Automation","Reports"]'::jsonb, null, 'Quote', null, true),

  ('software-sms-notification-integration', 'Software & Digital', 'Automation & Integrations', 'SMS Notification Integration', 'SMS Automation',
   'Add scheduled and event-based SMS notifications to customer, staff and operational workflows.',
   'MessageSquareText', '["SMS provider integration","Custom message templates","Scheduled messages","Status notifications","Delivery tracking"]'::jsonb, '["SMS","Notifications","Automation"]'::jsonb, null, 'Quote', null, true),

  ('software-ui-ux-responsive-design', 'Software & Digital', 'UI & UX', 'UI/UX & Responsive Web Design', 'UI/UX Design',
   'Clean, responsive interfaces for customer portals, admin systems and service marketplaces.',
   'PanelsTopLeft', '["Responsive layouts","Component design","Navigation UX","Forms and workflows","Dashboard styling"]'::jsonb, '["UI/UX","Responsive","Design"]'::jsonb, null, 'Quote', null, true),

  ('software-bug-fixing-performance', 'Software & Digital', 'Support & Maintenance', 'Bug Fixing & Performance Optimization', 'Technical Support',
   'Diagnose application issues, fix frontend or backend bugs and improve reliability, loading and runtime behavior.',
   'Bug', '["Error investigation","TypeScript fixes","React debugging","API troubleshooting","Performance cleanup"]'::jsonb, '["Bug Fixing","React","TypeScript","Performance"]'::jsonb, null, 'Quote', null, true),

  ('software-deployment-production-setup', 'Software & Digital', 'Support & Maintenance', 'Deployment & Production Setup', 'Production Deployment',
   'Prepare and deploy applications with environment configuration, database migrations and production checks.',
   'CloudUpload', '["Vercel deployment","Supabase deployment","Environment variables","Database migrations","Production verification"]'::jsonb, '["Vercel","Supabase","Deployment","Production"]'::jsonb, null, 'Quote', null, true)

on conflict (id) do update set
  category = excluded.category,
  subcategory = excluded.subcategory,
  title = excluded.title,
  label = excluded.label,
  description = excluded.description,
  icon = excluded.icon,
  items = excluded.items,
  tags = excluded.tags,
  starting_price = excluded.starting_price,
  starting_price_label = excluded.starting_price_label,
  image_url = excluded.image_url,
  enabled = excluded.enabled,
  updated_at = now();
