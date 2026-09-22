import { requireSupabase } from './supabase'

export type AdminDashboardStats = {
  requests:number; completed_jobs:number; cancelled_jobs:number; providers:number; customers:number;
  verified_providers:number; open_disputes:number; open_support:number; revenue:number; average_job_value:number;
}
export type AdminServiceReport = { service_key:string; requests:number; completed:number; quoted:number; revenue:number }
export type NotificationRow = { id:string; event_key:string; title:string; body:string; category:string; action_url:string|null; read_at:string|null; created_at:string }

export async function getAdminDashboardStats(from?:string,to?:string){
  const {data,error}=await requireSupabase().rpc('anywork_admin_dashboard_stats',{p_from:from||new Date(Date.now()-30*86400000).toISOString(),p_to:to||new Date().toISOString()})
  if(error) throw error
  return data as AdminDashboardStats
}
export async function getAdminServiceReport(from?:string,to?:string){
  const {data,error}=await requireSupabase().rpc('anywork_admin_service_report',{p_from:from||new Date(Date.now()-30*86400000).toISOString(),p_to:to||new Date().toISOString()})
  if(error) throw error
  return (data||[]) as AdminServiceReport[]
}
export async function listNotifications(){
  const {data,error}=await requireSupabase().from('anywork_notifications').select('*').order('created_at',{ascending:false}).limit(100)
  if(error) throw error
  return (data||[]) as NotificationRow[]
}
export async function markNotificationRead(id:string){
  const {error}=await requireSupabase().rpc('anywork_mark_notification_read',{p_id:id})
  if(error) throw error
}
export async function listEmailQueue(){
  const {data,error}=await requireSupabase().from('anywork_email_queue').select('*').order('created_at',{ascending:false}).limit(200)
  if(error) throw error
  return data||[]
}
export async function listNotificationTemplates(){
  const {data,error}=await requireSupabase().from('anywork_notification_templates').select('*').order('name')
  if(error) throw error
  return data||[]
}
export async function updateNotificationTemplate(id:string,input:{subject_template:string;body_template:string;enabled:boolean}){
  const {data,error}=await requireSupabase().from('anywork_notification_templates').update({...input,updated_at:new Date().toISOString()}).eq('id',id).select('*').single()
  if(error) throw error
  return data
}
export async function updateEmailQueueStatus(id:string,status:'Cancelled'){
  const {data,error}=await requireSupabase().from('anywork_email_queue').update({status,updated_at:new Date().toISOString()}).eq('id',id).select('*').single()
  if(error) throw error
  return data
}
