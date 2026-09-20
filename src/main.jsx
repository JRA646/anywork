import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight, CheckCircle2, CalendarDays, MapPin, MessageCircle, Upload,
  Menu, X, Star, Hammer, Printer, Wrench, Boxes, HardHat, BriefcaseBusiness,
  FileText, Users, Settings, LayoutDashboard, Search, Bell, Phone, Mail,
  ChevronRight, Clock3, Camera, CreditCard, PackageCheck, UserRound, LogOut,
  Plus, CircleDollarSign
} from "lucide-react";
import "./styles.css";

const services = [
  {id:"print", title:"Print", label:"Printing & signage", icon:Printer, description:"Banners, signage and promotional printing for business, events and sites.", items:["Banner & tarpaulin printing","Business & site signage","Window graphics","Promotional materials"]},
  {id:"build", title:"Build", label:"Furniture & fabrication", icon:Hammer, description:"Custom furniture, fixtures and practical built solutions.", items:["Custom furniture","Cabinets & counters","Shelving & storage","Custom fixtures"]},
  {id:"install", title:"Install", label:"Installation & assembly", icon:Boxes, description:"Professional installation and assembly for signs, furniture and displays.", items:["Banner installation","Sign installation","Furniture assembly","Display installation"]},
  {id:"maintain", title:"Maintain", label:"Handyman & maintenance", icon:Wrench, description:"General repairs and maintenance for homes, offices and commercial spaces.", items:["Minor repairs","Painting & patching","Fixture replacement","Property maintenance"]},
  {id:"site", title:"Site", label:"Site services", icon:HardHat, description:"Practical support for sites, fit-outs, preparation and coordination.", items:["Site preparation","Fit-out assistance","Material handling","Site coordination"]},
  {id:"custom", title:"Custom", label:"Special projects", icon:BriefcaseBusiness, description:"Have something unusual? Send the details and we will work out the right approach.", items:["Custom jobs","Event setup","Special fabrication","Other work"]}
];

const sampleJobs = [
  {id:"AW-1025", name:"Banner Installation", status:"Scheduled", date:"24 Sep 2026", location:"Parramatta", value:"$1,850", progress:72, service:"Install"},
  {id:"AW-1024", name:"Office Furniture Assembly", status:"Quote Sent", date:"27 Sep 2026", location:"North Sydney", value:"$920", progress:48, service:"Build"}
];

const requests = [
  {id:"AW-1026", customer:"ABC Business", service:"Furniture", status:"New", location:"Alexandria", date:"22 Sep 2026"},
  {id:"AW-1025", customer:"Retail Co.", service:"Signage", status:"Quoted", location:"Parramatta", date:"24 Sep 2026"},
  {id:"AW-1024", customer:"Office Group", service:"Printing", status:"Scheduled", location:"North Sydney", date:"27 Sep 2026"},
  {id:"AW-1023", customer:"Site Works", service:"Maintenance", status:"New", location:"Mascot", date:"29 Sep 2026"}
];

function App(){
  const [mode,setMode]=useState("customer");
  const [page,setPage]=useState("home");
  const [mobile,setMobile]=useState(false);
  const [quoteOpen,setQuoteOpen]=useState(false);
  const [selectedService,setSelectedService]=useState("");
  const [jobId,setJobId]=useState("AW-1025");

  const customerNav=["home","services","jobs","quotes","messages","profile"];
  const adminNav=["dashboard","jobs","quotes","customers","schedule","projects","invoices","messages"];
  const nav=mode==="customer"?customerNav:adminNav;
  const go=(next)=>{setPage(next);setMobile(false)};

  const openQuote=(service="")=>{setSelectedService(service);setQuoteOpen(true)};
  const closeQuote=()=>setQuoteOpen(false);

  return <div className="app">
    <header className="topbar">
      <button className="brand" onClick={()=>go(mode==="customer"?"home":"dashboard")}><span className="brandMark">AW</span><span>ANYwork</span></button>
      <nav className="desktopNav">{nav.slice(0,6).map(n=><button key={n} className={page===n?"active":""} onClick={()=>go(n)}>{label(n)}</button>)}</nav>
      <div className="topActions">
        <button className="modeBtn" onClick={()=>{setMode(mode==="customer"?"admin":"customer");go(mode==="customer"?"dashboard":"home")}}>{mode==="customer"?"Customer":"Admin"} <ChevronRight size={15}/></button>
        <button className="iconBtn mobileOnly" onClick={()=>setMobile(!mobile)}>{mobile?<X/>:<Menu/>}</button>
      </div>
    </header>
    {mobile&&<div className="mobileNav">{nav.map(n=><button key={n} onClick={()=>go(n)}>{label(n)}</button>)}</div>}
    {mode==="customer"
      ? <Customer page={page} go={go} openQuote={openQuote} jobId={jobId} setJobId={setJobId}/>
      : <Admin page={page} go={go} openQuote={openQuote} setJobId={setJobId}/>}
    <footer><strong>ANYwork Services</strong><span>Print. Build. Install. Maintain.</span><span>Literally any work.</span><span className="footerRight">© 2026 ANYwork</span></footer>
    {quoteOpen&&<QuoteWizard initialService={selectedService} close={closeQuote}/>}
  </div>
}

const label=n=>n==="home"?"Home":n.split("-").map(x=>x[0].toUpperCase()+x.slice(1)).join(" ");

function Customer({page,go,openQuote,jobId,setJobId}){
  if(page==="services") return <Services openQuote={openQuote}/>;
  if(page==="jobs") return <CustomerJobs go={go} setJobId={setJobId}/>;
  if(page==="job") return <JobDetail jobId={jobId} go={go}/>;
  if(page==="quotes") return <CustomerQuotes openQuote={openQuote} go={go}/>;
  if(page==="messages") return <Messages/>;
  if(page==="profile") return <CustomerProfile/>;
  return <Home go={go} openQuote={openQuote}/>;
}

function Home({go,openQuote}){
  return <>
    <section className="hero">
      <div>
        <div className="eyebrow">ANYWORK SERVICES</div>
        <h1>Got a job that<br/><em>needs doing?</em></h1>
        <p>Tell us what you need. From printing and fabrication to installation, maintenance and site services, we work out the solution.</p>
        <div className="actions"><button className="primary" onClick={()=>openQuote()}>Request a Quote <ArrowRight size={18}/></button><button className="secondary" onClick={()=>go("services")}>Explore Services</button></div>
        <div className="trust"><span><CheckCircle2/> Clear quotes</span><span><CheckCircle2/> Job tracking</span><span><CheckCircle2/> Before & after photos</span></div>
      </div>
      <div className="heroCard"><div className="heroCardTop"><span>ANY JOB</span><span className="dot"/></div><h3>Start with a photo.</h3><p>Don't know which service you need? Show us the job, add your location and we'll help identify the right service.</p><button onClick={()=>openQuote()}>Tell us what you need <ArrowRight size={16}/></button></div>
    </section>
    <section className="section"><SectionHead eyebrow="WHAT WE DO" title="One team. Many services." action="View all services" onClick={()=>go("services")}/><div className="serviceGrid">{services.map(s=><ServiceCard key={s.id} service={s} onClick={()=>openQuote(s.id)}/>)}</div></section>
    <section className="split"><div><div className="eyebrow">HOW IT WORKS</div><h2>From request to done.</h2><div className="steps"><Step n="01" t="Request a quote" d="Describe the job and add photos."/><Step n="02" t="Review & approve" d="We prepare a clear quotation."/><Step n="03" t="Schedule the work" d="Pick a suitable date and location."/><Step n="04" t="Track completion" d="See updates, photos and your invoice."/></div></div><div className="darkPanel"><span className="eyebrow">YOUR NEXT JOB</span><h3>One simple request.</h3><p>Every job gets a clear status, schedule, messages, photos and invoice so you always know what happens next.</p><button className="primary light" onClick={()=>openQuote()}>Start a request <ArrowRight size={17}/></button></div></section>
    <section className="section"><SectionHead eyebrow="RECENT WORK" title="Projects we can do." action="View projects" onClick={()=>go("projects")}/><div className="projectPreview"><ProjectTile title="Commercial Signage" category="Signage & installation"/><ProjectTile title="Custom Office Furniture" category="Build & installation"/><ProjectTile title="Event Banner Setup" category="Printing & installation"/></div></section>
  </>
}

function SectionHead({eyebrow,title,action,onClick}){return <div className="sectionHead"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>{action&&<button className="textBtn" onClick={onClick}>{action}<ArrowRight size={16}/></button>}</div>}
function ServiceCard({service,onClick}){const I=service.icon;return <button className="serviceCard" onClick={onClick}><div className="serviceIcon"><I size={22}/></div><h3>{service.title}</h3><p>{service.label}</p><span>{service.items.slice(0,2).join(" • ")}</span><ArrowRight className="cardArrow" size={18}/></button>}
function Services({openQuote}){const [selected,setSelected]=useState(null);const SelectedIcon=selected?.icon;return <section className="section pageSection"><div className="eyebrow">OUR SERVICES</div><h1>Print. Build. Install.<br/>Maintain.</h1><p className="lead">Choose a service or simply tell us what you need. ANYwork can handle custom jobs too.</p><div className="serviceGrid">{services.map(s=><ServiceCard key={s.id} service={s} onClick={()=>setSelected(s)}/>)}</div>{selected&&<div className="serviceDetail"><div className="serviceDetailCopy"><div className="eyebrow">{selected.title.toUpperCase()}</div><h2>{selected.label}</h2><p>{selected.description}</p><ul>{selected.items.map(i=><li key={i}><CheckCircle2 size={16}/>{i}</li>)}</ul><button className="primary" onClick={()=>openQuote(selected.id)}>Request a Quote <ArrowRight size={17}/></button></div><div className="detailVisual">{SelectedIcon&&<SelectedIcon size={70}/>}<span>Custom quote based on your job</span></div></div>}<div className="customBanner"><div><span className="eyebrow">NOT SURE?</span><h2>Something else?</h2><p>Send us the details. We'll work out the right approach.</p></div><button className="primary" onClick={()=>openQuote()}>Request a Quote <ArrowRight size={18}/></button></div></section>}

function CustomerJobs({go,setJobId}){return <section className="section pageSection"><div className="eyebrow">CUSTOMER PORTAL</div><div className="pageTitleRow"><div><h1>My Jobs</h1><p className="lead">Track every request from quote to completion.</p></div><button className="primary" onClick={()=>go("home")}>New request <Plus size={17}/></button></div><div className="jobList">{sampleJobs.map(j=><button className="jobCard" key={j.id} onClick={()=>{setJobId(j.id);go("job")}}><div className="jobMain"><span className="jobId">{j.id}</span><h3>{j.name}</h3><p><MapPin size={15}/> {j.location} <span>•</span> <CalendarDays size={15}/> {j.date}</p></div><div className="jobStatus"><span className={"status "+(j.status==="Scheduled"?"green":"amber")}>{j.status}</span><strong>{j.value}</strong></div><div className="progress"><span style={{width:j.progress+"%"}}/></div></button>)}</div></section>}

function JobDetail({jobId,go}){const job=sampleJobs.find(j=>j.id===jobId)||sampleJobs[0];return <section className="section pageSection"><button className="backBtn" onClick={()=>go("jobs")}>← Back to jobs</button><div className="jobDetailHead"><div><span className="jobId">{job.id}</span><h1>{job.name}</h1><p className="lead">{job.location} • {job.date}</p></div><span className="status green">{job.status}</span></div><div className="jobTimeline"><TimelineItem done title="Request submitted" text="Your job details were received."/><TimelineItem done title="Quote approved" text="Quotation accepted by customer."/><TimelineItem done={job.status==="Scheduled"} title="Scheduled" text="24 Sep 2026 at 9:00 AM"/><TimelineItem title="Work in progress" text="You'll receive progress updates and photos."/><TimelineItem title="Completed" text="Final photos and invoice will appear here."/></div><div className="detailGrid"><div className="panel"><PanelTitle title="Job details"/><p>Banner installation for a commercial site. Final measurements and access requirements will be confirmed before work begins.</p><div className="infoList"><span><MapPin/> Parramatta</span><span><CalendarDays/> 24 Sep 2026 • 9:00 AM</span><span><BriefcaseBusiness/> Installation</span></div></div><div className="panel"><PanelTitle title="Job photos"/><div className="photoGrid"><div><Camera/><span>Before</span></div><div><Camera/><span>During</span></div><div><Camera/><span>Completed</span></div></div></div></div></section>}

function TimelineItem({done,title,text}){return <div className={"timelineItem "+(done?"done":"")}><div className="timelineDot">{done?<CheckCircle2 size={17}/>:<Clock3 size={16}/>}</div><div><strong>{title}</strong><p>{text}</p></div></div>}
function PanelTitle({title,action}){return <div className="panelHead"><h2>{title}</h2>{action}</div>}

function CustomerQuotes({openQuote,go}){const [detail,setDetail]=useState(false);return <section className="section pageSection"><div className="eyebrow">QUOTES</div><div className="pageTitleRow"><div><h1>Your Quotes</h1><p className="lead">Review, approve or request changes.</p></div><button className="primary" onClick={()=>openQuote()}>Request another quote</button></div><div className="quoteRow"><div><span className="jobId">AW-1025</span><h3>Banner Installation</h3><p>Valid until 30 Sep 2026</p></div><div><strong>$1,850</strong><span className="status amber">Pending approval</span></div><button className="primary small" onClick={()=>setDetail(true)}>View quote</button></div>{detail&&<QuoteDetail close={()=>setDetail(false)} go={go}/>}</section>}

function QuoteDetail({close,go}){return <div className="modalOverlay"><div className="modal quoteModal"><button className="iconBtn closeModal" onClick={close}><X/></button><div className="eyebrow">QUOTE #AW-1025</div><h2>Banner Installation</h2><p>Commercial banner supply and installation.</p><div className="priceRows"><span>Materials <b>$1,050</b></span><span>Labour <b>$500</b></span><span>Installation <b>$300</b></span><strong>Total <b>$1,850</b></strong></div><p className="muted">Valid until 30 Sep 2026. You can request changes before approving.</p><div className="modalActions"><button className="secondary" onClick={close}>Request Changes</button><button className="primary" onClick={()=>{close();go("job")}}>Approve Quote <CheckCircle2 size={17}/></button></div></div></div>}

function Messages(){return <section className="section pageSection"><div className="eyebrow">MESSAGES</div><h1>ANYwork Support</h1><div className="chat"><div className="chatHeader"><span><MessageCircle/> Job #AW-1025</span><span className="status green">Active</span></div><div className="message them">Hi! How can we help with your job?</div><div className="message me">Can you arrive around 10 AM instead?</div><div className="message them">Yes, we've updated your appointment.</div><div className="chatInput"><input placeholder="Type a message..."/><button className="primary small">Send</button></div></div></section>}

function CustomerProfile(){return <section className="section pageSection"><div className="eyebrow">ACCOUNT</div><h1>Profile</h1><div className="profileGrid"><div className="panel profileCard"><div className="avatar">JD</div><h2>John Doe</h2><p className="muted">Customer</p><div className="infoList"><span><Mail/> john@example.com</span><span><Phone/> +61 400 000 000</span></div><button className="secondary">Edit profile</button></div><div className="panel"><PanelTitle title="Saved address"/><p>2 Example Street, Parramatta NSW</p><button className="secondary">Manage addresses</button><hr/><PanelTitle title="Notifications"/><label className="toggleRow"><span>Job updates</span><input type="checkbox" defaultChecked/></label><label className="toggleRow"><span>Quote notifications</span><input type="checkbox" defaultChecked/></label></div></div></section>}

function QuoteWizard({initialService,close}){const [step,setStep]=useState(initialService?2:1),[service,setService]=useState(initialService||""),[sent,setSent]=useState(false);if(sent)return <div className="modalOverlay"><div className="modal success"><button className="iconBtn closeModal" onClick={close}><X/></button><CheckCircle2 size={58}/><h2>We've got it.</h2><p>Your request has been submitted. We'll review the details and contact you with the next steps.</p><div className="requestId">REQUEST #AW-1026</div><button className="primary" onClick={close}>Back to ANYwork</button></div></div>;return <div className="modalOverlay"><div className="modal wizardModal"><button className="iconBtn closeModal" onClick={close}><X/></button><div className="eyebrow">REQUEST A QUOTE</div><h2>Tell us about the job.</h2><div className="wizardSteps"><span className={step>=1?"on":""}>01 Service</span><span className={step>=2?"on":""}>02 Details</span><span className={step>=3?"on":""}>03 Photos & contact</span></div>{step===1&&<><h3>What do you need?</h3><p className="muted">Choose a service or let us help.</p><div className="optionGrid">{services.map(s=><button key={s.id} className={"option "+(service===s.id?"selected":"")} onClick={()=>setService(s.id)}><s.icon size={22}/><span>{s.title}</span><small>{s.label}</small></button>)}</div><div className="modalActions"><button className="primary" disabled={!service} onClick={()=>setStep(2)}>Continue <ArrowRight size={17}/></button></div></>}{step===2&&<><h3>Describe the job</h3><p className="muted">More detail helps us prepare the right quote.</p><textarea placeholder="Tell us what you need..."/><div className="formGrid"><input placeholder="Preferred date"/><input placeholder="Job location"/></div><div className="modalActions"><button className="secondary" onClick={()=>setStep(1)}>Back</button><button className="primary" onClick={()=>setStep(3)}>Continue <ArrowRight size={17}/></button></div></>}{step===3&&<><h3>Add photos & contact details</h3><p className="muted">Photos, measurements or reference images are welcome.</p><div className="upload"><Upload size={25}/><strong>Drop photos here or click to upload</strong><span>JPG, PNG up to 10MB each</span></div><div className="formGrid"><input placeholder="Full name"/><input placeholder="Phone number"/><input placeholder="Email address"/><input placeholder="Preferred contact method"/></div><div className="modalActions"><button className="secondary" onClick={()=>setStep(2)}>Back</button><button className="primary" onClick={()=>setSent(true)}>Submit Request <ArrowRight size={17}/></button></div></>}</div></div>}

function Admin({page,go,openQuote,setJobId}){return <section className="admin"><aside><div className="sideBrand"><span className="brandMark">AW</span><b>ANYwork</b></div><div className="sideLabel">OPERATIONS</div>{["dashboard","jobs","quotes","customers","schedule","projects","invoices","messages"].map(n=><button className={page===n?"sideActive":""} onClick={()=>go(n)} key={n}>{adminIcon(n)}{label(n)}</button>)}<div className="sideSpacer"/><button><Settings/>Settings</button></aside><div className="adminContent"><AdminHeader page={page} openQuote={openQuote}/>{page==="dashboard"?<Dashboard go={go} setJobId={setJobId}/>:page==="jobs"?<AdminJobs go={go} setJobId={setJobId}/>:page==="quotes"?<AdminQuotes/>:page==="customers"?<AdminCustomers/>:page==="schedule"?<Schedule/>:page==="projects"?<Projects/>:page==="invoices"?<Invoices/>:<Messages/>}</div></section>}

const adminIcon=n=>n==="dashboard"?<LayoutDashboard/>:n==="jobs"?<BriefcaseBusiness/>:n==="quotes"?<FileText/>:n==="customers"?<Users/>:n==="schedule"?<CalendarDays/>:n==="projects"?<Boxes/>:n==="invoices"?<CircleDollarSign/>:<MessageCircle/>;

function AdminHeader({page,openQuote}){return <div className="adminHeader"><div><div className="eyebrow">OPERATIONS</div><h1>{page==="dashboard"?"Good morning, ANYwork":"Manage "+label(page)}</h1></div><button className="primary" onClick={()=>openQuote()}><Plus size={17}/> New Request</button></div>}
function Dashboard({go,setJobId}){const stats=[["NEW REQUESTS","8",LayoutDashboard],["QUOTES","5",FileText],["ACTIVE JOBS","12",BriefcaseBusiness],["COMPLETED","16",CheckCircle2]];return <><div className="stats">{stats.map(([a,b,I])=><div className="stat" key={a}><I/><span>{a}</span><strong>{b}</strong></div>)}</div><div className="adminGrid"><div className="panel"><PanelTitle title="Today's Schedule" action={<span>21 Sep 2026</span>}/>{["Banner Installation","Furniture Delivery","Site Inspection","Sign Installation"].map((x,i)=><div className="scheduleRow" key={x}><time>{["08:00","10:30","13:00","15:30"][i]}</time><div><strong>{x}</strong><span>{["Parramatta","North Sydney","Alexandria","Mascot"][i]}</span></div><span className="status green">{i<2?"Scheduled":"Pending"}</span></div>)}</div><div className="panel"><PanelTitle title="Recent Requests" action={<button className="textBtn">View all</button>}/>{requests.map(r=><div className="requestRow" key={r.id}><span>{r.id}</span><strong>{r.service}</strong><span className="status amber">{r.status}</span></div>)}</div></div><div className="panel dashboardBottom"><PanelTitle title="Job pipeline"/><div className="pipeline">{["New","Quoted","Approved","Scheduled","In Progress","Completed"].map((x,i)=><div key={x}><span>{x}</span><strong>{[8,5,3,12,4,16][i]}</strong></div>)}</div></div></>}
function AdminJobs({go,setJobId}){return <div className="panel"><PanelTitle title="Jobs" action={<div className="searchBox"><Search size={15}/><input placeholder="Search jobs"/></div>}/><div className="table">{requests.map(r=><button key={r.id} onClick={()=>{setJobId(r.id);go("jobs")}} className="tableRow"><span>{r.id}</span><strong>{r.customer}</strong><span>{r.service}</span><span>{r.location}</span><span className="status amber">{r.status}</span><ChevronRight/></button>)}</div><div className="jobAdminDetail"><div className="eyebrow">SELECTED JOB</div><h2>Job #AW-1025</h2><p>Banner Installation • Retail Co. • Parramatta</p><div className="adminActions"><button className="secondary">Assign team</button><button className="secondary">Schedule</button><button className="secondary">Message customer</button><button className="primary">Mark in progress</button></div></div></div>}
function AdminQuotes(){return <div className="panel"><PanelTitle title="Quotes" action={<button className="primary small">+ Create quote</button>}/><div className="table">{["AW-1025","AW-1024","AW-1023"].map((id,i)=><div className="tableRow" key={id}><span>{id}</span><strong>{["Retail Co.","Office Group","Site Works"][i]}</strong><span>{["Banner Installation","Furniture Assembly","Maintenance"][i]}</span><strong>{["$1,850","$920","$640"][i]}</strong><span className={"status "+(i===0?"amber":"green")}>{["Pending approval","Approved","Approved"][i]}</span><ChevronRight/></div>)}</div></div>}
function AdminCustomers(){return <div className="panel"><PanelTitle title="Customers" action={<button className="secondary"><Plus size={15}/> Add customer</button>}/><div className="customerCards">{["Retail Co.","Office Group","ABC Business","Site Works"].map((x,i)=><div className="customerCard" key={x}><div className="avatar smallAvatar">{x.slice(0,2).toUpperCase()}</div><div><strong>{x}</strong><span>{[3,8,2,5][i]} jobs • last active recently</span></div><ChevronRight/></div>)}</div></div>}
function Schedule(){return <div className="panel"><PanelTitle title="Schedule" action={<button className="primary small"><Plus size={15}/> Add appointment</button>}/><div className="calendar"><div className="calendarHead">{["Mon 21","Tue 22","Wed 23","Thu 24","Fri 25","Sat 26","Sun 27"].map(d=><strong key={d}>{d}</strong>)}</div><div className="calendarGrid">{["08:00 Banner Installation","10:30 Furniture Delivery","13:00 Site Inspection","15:30 Sign Installation","09:00 Office Assembly","11:00 Sign Production"].map((x,i)=><div className="calendarEvent" key={x} style={{gridColumn:((i%5)+1)}}><Clock3 size={13}/>{x}</div>)}</div></div></div>}
function Projects(){return <div className="panel"><PanelTitle title="Projects" action={<button className="primary small"><Plus size={15}/> Add project</button>}/><div className="projectGrid"><ProjectTile title="Commercial Signage" category="Signage & installation"/><ProjectTile title="Custom Office Furniture" category="Build & installation"/><ProjectTile title="Event Banner Setup" category="Printing & installation"/><ProjectTile title="Shop Fit-out" category="Site services"/></div></div>}
function ProjectTile({title,category}){return <div className="projectTile"><div className="projectImage"><Boxes size={34}/></div><div><span>{category}</span><h3>{title}</h3></div></div>}
function Invoices(){return <div className="panel"><PanelTitle title="Invoices" action={<button className="primary small"><Plus size={15}/> New invoice</button>}/><div className="invoiceCards">{["INV-1025","INV-1024","INV-1023"].map((id,i)=><div className="invoiceCard" key={id}><FileText/><div><span>{id}</span><strong>{["$1,850","$920","$640"][i]}</strong><small>{["Due 30 Sep","Paid","Paid"][i]}</small></div><button className="secondary small">View</button></div>)}</div></div>}

createRoot(document.getElementById("root")).render(<App/>);
