"use client";
import { FormEvent, useEffect, useState } from "react";
import { Edit3, Plus, Trash2, X } from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase";

export type CRMSettings = {
  visible_sections?: string[];
  accent_color?: string;
  display_style?: "comfortable" | "compact" | "soft";
};
type Field = {id:string;entity_type:"booking"|"customer"|"service";label:string;field_key:string;field_type:string;required:boolean;visible:boolean;display_order:number;options:string[]};
const sections=["overview","calendar","bookings","services","customers","staff","loyalty","reports","payments","settings"];
const defaults=sections.slice();
export default function SettingsCRM({businessId,initial,onSaved}:{businessId:string;initial:CRMSettings;onSaved:(x:CRMSettings)=>void}){
 const supabase=getSupabaseBrowser();
 const [settings,setSettings]=useState<CRMSettings>({visible_sections:defaults,accent_color:"#4f46e5",display_style:"comfortable",...initial});
 const [fields,setFields]=useState<Field[]>([]),[editing,setEditing]=useState<Field|null|"new">(null),[entity,setEntity]=useState<"booking"|"customer"|"service">("booking"),[notice,setNotice]=useState("");
 async function load(){const{data}=await supabase.from("custom_fields").select("*").eq("business_id",businessId).order("display_order");setFields((data||[]) as Field[])}
 useEffect(()=>{load()},[businessId]);
 function toggleSection(name:string){if(name==="settings")return;const current=settings.visible_sections||defaults;setSettings({...settings,visible_sections:current.includes(name)?current.filter(x=>x!==name):[...current,name]})}
 async function saveSettings(){const{error}=await supabase.from("businesses").update({crm_settings:settings}).eq("id",businessId);if(error)return setNotice(error.message);setNotice("CRM settings saved");onSaved(settings)}
 async function saveField(e:FormEvent<HTMLFormElement>){e.preventDefault();const d=new FormData(e.currentTarget),label=String(d.get("label")||""),payload={business_id:businessId,entity_type:d.get("entity_type"),label,field_key:editing==="new"?`${String(d.get("entity_type"))}_${label.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")}_${Date.now().toString().slice(-5)}`:editing!.field_key,field_type:d.get("field_type"),required:d.get("required")==="on",visible:d.get("visible")==="on",display_order:Number(d.get("display_order")||0),options:String(d.get("options")||"").split(",").map(x=>x.trim()).filter(Boolean)};
  const result=editing==="new"?await supabase.from("custom_fields").insert(payload):await supabase.from("custom_fields").update(payload).eq("id",editing!.id);if(result.error)return setNotice(result.error.message);setEditing(null);setNotice("Custom field saved");load()}
 async function remove(f:Field){if(!confirm(`Delete the field “${f.label}”?`))return;const{error}=await supabase.from("custom_fields").delete().eq("id",f.id);if(error)setNotice(error.message);else{setNotice("Custom field deleted");load()}}
 const visible=fields.filter(f=>f.entity_type===entity);
 return <section className="settings-page">
  {notice&&<div className="notice">{notice}</div>}
  <div className="settings-grid">
   <article className="feature settings-card"><h2>CRM appearance</h2><p>Personalize how your private business dashboard looks.</p>
    <label className="field">Accent color<input type="color" value={settings.accent_color||"#4f46e5"} onChange={e=>setSettings({...settings,accent_color:e.target.value})}/></label>
    <label className="field">Display style<select value={settings.display_style||"comfortable"} onChange={e=>setSettings({...settings,display_style:e.target.value as CRMSettings["display_style"]})}><option value="comfortable">Comfortable</option><option value="compact">Compact</option><option value="soft">Soft and rounded</option></select></label>
   </article>
   <article className="feature settings-card"><h2>Visible sections</h2><p>Turn dashboard areas on or off for this business.</p><div className="section-toggles">{sections.map(s=><label className="toggle" key={s}><input type="checkbox" checked={(settings.visible_sections||defaults).includes(s)} disabled={s==="settings"} onChange={()=>toggleSection(s)}/><span>{title(s)}</span></label>)}</div></article>
  </div>
  <div className="settings-save"><button className="btn btn-primary" onClick={saveSettings}>Save CRM settings</button></div>
  <article className="feature custom-fields"><header><div><h2>Custom information fields</h2><p>Choose what information you want to collect for every booking, customer, and service.</p></div><button className="btn btn-primary" onClick={()=>setEditing("new")}><Plus size={16}/> Add field</button></header>
   <div className="entity-tabs">{(["booking","customer","service"] as const).map(x=><button className={entity===x?"active":""} onClick={()=>setEntity(x)} key={x}>{title(x)} fields</button>)}</div>
   {visible.length===0?<div className="empty-small">No custom fields yet.</div>:<div className="field-list">{visible.map(f=><div key={f.id}><span><b>{f.label}</b><small>{title(f.field_type)}{f.required?" · Required":""}{!f.visible?" · Hidden":""}</small></span><span className="row-actions"><button onClick={()=>setEditing(f)}><Edit3 size={15}/></button><button onClick={()=>remove(f)}><Trash2 size={15}/></button></span></div>)}</div>}
  </article>
  {editing&&<div className="modal-backdrop"><form className="modal" onSubmit={saveField}><button type="button" className="modal-x" onClick={()=>setEditing(null)}><X/></button><h2>{editing==="new"?"Add":"Edit"} custom field</h2>
   <label className="field">Used for<select name="entity_type" defaultValue={editing==="new"?entity:editing.entity_type}>{(["booking","customer","service"] as const).map(x=><option value={x} key={x}>{title(x)}</option>)}</select></label>
   <label className="field">Field label<input name="label" required defaultValue={editing==="new"?"":editing.label} placeholder="Example: Address"/></label>
   <label className="field">Field type<select name="field_type" defaultValue={editing==="new"?"text":editing.field_type}>{["text","textarea","number","date","select","checkbox"].map(x=><option value={x} key={x}>{title(x)}</option>)}</select></label>
   <label className="field">Options <small>(only for a dropdown; separate with commas)</small><input name="options" defaultValue={editing==="new"?"":(editing.options||[]).join(", ")}/></label>
   <label className="field">Display order<input name="display_order" type="number" defaultValue={editing==="new"?visible.length:editing.display_order}/></label>
   <label className="toggle"><input name="required" type="checkbox" defaultChecked={editing==="new"?false:editing.required}/> Required</label><label className="toggle"><input name="visible" type="checkbox" defaultChecked={editing==="new"?true:editing.visible}/> Visible</label>
   <div className="modal-actions"><button type="button" className="btn btn-secondary" onClick={()=>setEditing(null)}>Cancel</button><button className="btn btn-primary">Save field</button></div>
  </form></div>}
 </section>
}
function title(x:string){return x.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}
