import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors={ 'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req)=>{
 if(req.method==='OPTIONS') return new Response('ok',{headers:cors})
 try{
  const supabase=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const resendKey=Deno.env.get('RESEND_API_KEY')
  const sender=Deno.env.get('ANYWORK_EMAIL_FROM') || 'ANYwork <no-reply@anywork.app>'
  if(!resendKey) throw new Error('RESEND_API_KEY is not configured')
  const body=await req.json()
  const queueId=String(body.queueId||'')
  if(!queueId) throw new Error('queueId is required')
  const {data:item,error:loadError}=await supabase.from('anywork_email_queue').select('*').eq('id',queueId).single()
  if(loadError) throw loadError
  if(['Sent','Cancelled'].includes(item.status)) return Response.json({sent:item.status==='Sent',status:item.status},{headers:cors})
  await supabase.from('anywork_email_queue').update({status:'Sending',attempts:Number(item.attempts||0)+1,last_error:null}).eq('id',queueId)
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resendKey,'Content-Type':'application/json'},body:JSON.stringify({from:sender,to:[item.recipient_email],subject:item.subject,html:item.body_html})})
  const result=await response.json()
  if(!response.ok){
    await supabase.from('anywork_email_queue').update({status:'Failed',last_error:String(result?.message||'Email provider error')}).eq('id',queueId)
    throw new Error(String(result?.message||'Email provider error'))
  }
  await supabase.from('anywork_email_queue').update({status:'Sent',provider_message_id:result.id||null,sent_at:new Date().toISOString(),last_error:null}).eq('id',queueId)
  return Response.json({sent:true,messageId:result.id},{headers:cors})
 }catch(error){
  return Response.json({sent:false,error:error instanceof Error?error.message:String(error)},{status:400,headers:cors})
 }
})