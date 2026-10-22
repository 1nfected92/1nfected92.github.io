import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm';

const SUPABASE_URL = 'https://ryhccsjgpyatjtilgmsy.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LVK9u5VNut0nIdea39F_IQ_YsszEZkR';
const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { settings: null, services: [], employees: [], currentEmployee: null, activeTimeEntry: null, currentRole: 'client', currentLookupPhone: '' };

const vehicleCatalog = {
  'Kia':['K3','Picanto','Sportage','Stonic','Seltos','Sorento','Niro'],
  'Renault':['Duster','Kardian','Logan','Sandero','Stepway','Koleos','Oroch'],
  'Toyota':['Corolla Cross','Hilux','Land Cruiser','Yaris Cross','RAV4','Fortuner','Corolla'],
  'Chevrolet':['Onix','Tracker','Captiva','N400','Joy','Colorado','Tahoe'],
  'Mazda':['CX-30','Mazda 2','Mazda 3','CX-5','CX-60','CX-90'],
  'Tesla':['Model Y','Model 3'],
  'Suzuki':['Swift','Dzire','Vitara','Fronx','S-Cross','Jimny'],
  'Nissan':['Kicks','Versa','X-Trail','Frontier','Qashqai','March'],
  'Hyundai':['Kona','Tucson','Creta','Santa Fe','HB20','Grand i10'],
  'Volkswagen':['T-Cross','Nivus','Taos','Virtus','Polo','Jetta'],
  'BYD':['Yuan UP','Dolphin','Song Plus','Seal','Seagull'],
  'Ford':['Territory','Ranger','Escape','Bronco Sport','Explorer','Maverick'],
  'Foton':['BJ','Tunland','Aumark'],
  'Chery':['Tiggo 2 Pro','Tiggo 4 Pro','Tiggo 7 Pro','Tiggo 8 Pro'],
  'MG':['ZS','MG3','MG4','HS'],
  'BMW':['Serie 1','Serie 3','X1','X3','X5'],
  'Mercedes-Benz':['Clase A','Clase C','GLA','GLC','GLE'],
  'Otro':['Otro modelo']
};

const statusLabels = {requested:'Solicitado',confirmed:'Confirmado',in_progress:'En proceso',ready:'Listo',completed:'Entregado',cancelled:'Cancelado'};
const icons = ['✦','◈','◇','✧','⬡','◉','✺','◆'];
const money = (n=0) => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n)||0);
const normalizePhone = (v='') => v.replace(/\D/g,'');
const shortTime = (t='') => String(t).slice(0,5);
const pad = n => String(n).padStart(2,'0');
const dateLabel = d => d ? new Intl.DateTimeFormat('es-CO',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'America/Bogota'}).format(new Date(`${d}T12:00:00-05:00`)) : '—';
const localDateTime = iso => iso ? new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date(iso)) : '—';
const escapeHtml = (s='') => String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function bogotaParts(){
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
  return Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
}
function todayISO(){ const p=bogotaParts(); return `${p.year}-${p.month}-${p.day}`; }
function generateCode(){ return `WME-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0,6).toUpperCase()}`; }
function timeToMinutes(t){ const [h,m]=shortTime(t).split(':').map(Number); return h*60+m; }
function minutesToTime(m){ return `${pad(Math.floor(m/60)%24)}:${pad(m%60)}`; }
function toast(msg,type='ok'){ const el=$('#toast'); el.textContent=msg; el.className=`toast ${type==='error'?'error':''} show`; clearTimeout(toast.t); toast.t=setTimeout(()=>el.className='toast',3300); }
function errMsg(err){ console.error(err); return err?.message || 'Ocurrió un error inesperado.'; }

async function loadCore(){
  const [{data:settings,error:se},{data:services,error:sve},{data:employees,error:ee}] = await Promise.all([
    db.from('business_settings').select('*').limit(1).single(),
    db.from('services').select('*').order('sort_order'),
    db.from('employees').select('*').order('first_name')
  ]);
  if(se||sve||ee) throw se||sve||ee;
  state.settings=settings; state.services=services||[]; state.employees=employees||[];
  renderServices(); populateCoreSelects(); applySettings(); setDefaultDates();
  await updateHeroAvailability();
}

function renderServices(){
  $('#servicesGrid').innerHTML=state.services.filter(s=>s.active).map((s,i)=>`<article class="service-card reveal"><div class="service-index"><span>${String(i+1).padStart(2,'0')} · ${escapeHtml(s.category)}</span><span class="service-icon">${icons[i%icons.length]}</span></div><h3>${escapeHtml(s.name)}</h3><p>${escapeHtml(s.description)}</p><footer><strong>${money(s.price_cop)}</strong><small>${s.duration_minutes} min</small></footer></article>`).join('');
  observeReveals();
  const options=state.services.filter(s=>s.active).map(s=>`<option value="${s.id}">${escapeHtml(s.name)} · ${money(s.price_cop)}</option>`).join('');
  $('#serviceSelect').innerHTML='<option value="">Seleccionar servicio</option>'+options;
  $('#editService').innerHTML=options;
}
function populateCoreSelects(){
  const empOptions=state.employees.filter(e=>e.active).map(e=>`<option value="${e.id}">${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)} · ${escapeHtml(e.position)}</option>`).join('');
  $('#employeePicker').innerHTML=empOptions;
  $('#employeeFilePicker').innerHTML=empOptions;
  if(!state.currentEmployee && state.employees.length) state.currentEmployee=state.employees.find(e=>e.active)?.id;
  if(state.currentEmployee) $('#employeePicker').value=state.currentEmployee;
}
function applySettings(){
  const s=state.settings;if(!s)return;
  $('#addressText').textContent=s.address;
  const maps=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;
  $('#mapsLink').href=maps;$('#mapAnchor').href=maps;
  $('#mapFrame').src=`https://www.google.com/maps?q=${encodeURIComponent(s.address)}&output=embed`;
  $('#settingPhone').value=s.phone||'';$('#settingAddress').value=s.address||'';$('#settingOpen').value=shortTime(s.open_time);$('#settingClose').value=shortTime(s.close_time);$('#settingInterval').value=s.slot_interval_minutes;$('#settingCapacity').value=s.slot_capacity;$('#settingPayroll').value=s.payroll_cycle;$('#payrollCycle').value=s.payroll_cycle;
}
function setDefaultDates(){
  const today=todayISO();
  $('#bookingDate').min=today;$('#editDate').min=today;$('#ownerDate').value=today;
  if(!$('#bookingDate').value){ const d=new Date(`${today}T12:00:00-05:00`); d.setDate(d.getDate()+1); $('#bookingDate').value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  const end=new Date(`${today}T12:00:00-05:00`); const start=new Date(end);
  const cycle=state.settings?.payroll_cycle||'weekly'; start.setDate(end.getDate()-(cycle==='biweekly'?13:6));
  $('#payrollStart').value=`${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`; $('#payrollEnd').value=today;
  refreshBookingSlots();
}

function initVehicleSelectors(){
  $('#vehicleMake').innerHTML='<option value="">Seleccionar</option>'+Object.keys(vehicleCatalog).map(k=>`<option>${escapeHtml(k)}</option>`).join('');
  const current=Number(todayISO().slice(0,4)); let y='<option value="">Seleccionar</option>'; for(let i=current;i>=1990;i--) y+=`<option>${i}</option>`; $('#vehicleYear').innerHTML=y;
  $('#vehicleMake').addEventListener('change',()=>{const make=$('#vehicleMake').value;const models=vehicleCatalog[make]||[];$('#vehicleModel').disabled=!make;$('#vehicleModel').innerHTML=make?'<option value="">Seleccionar</option>'+models.map(m=>`<option>${escapeHtml(m)}</option>`).join(''):'<option value="">Primero elige marca</option>';});
}

async function getAvailability(date){
  if(!date||!state.settings)return[];
  const {data,error}=await db.from('bookings').select('start_time,status').eq('appointment_date',date).neq('status','cancelled'); if(error)throw error;
  const counts={};(data||[]).forEach(b=>{const k=shortTime(b.start_time);counts[k]=(counts[k]||0)+1;});
  const open=timeToMinutes(state.settings.open_time), close=timeToMinutes(state.settings.close_time), step=Number(state.settings.slot_interval_minutes)||120, cap=Number(state.settings.slot_capacity)||1;
  const now=bogotaParts(); const today=todayISO(); const nowMin=Number(now.hour)*60+Number(now.minute); const slots=[];
  for(let m=open;m<=close;m+=step){const t=minutesToTime(m),available=Math.max(0,cap-(counts[t]||0)); const past=date===today&&m<=nowMin; slots.push({time:t,available,past});}
  return slots;
}
async function refreshBookingSlots(){
  const date=$('#bookingDate').value, sel=$('#bookingTime'); if(!date){sel.disabled=true;return;}
  try{const slots=await getAvailability(date);sel.innerHTML='<option value="">Seleccionar horario</option>'+slots.map(s=>`<option value="${s.time}" ${s.available===0||s.past?'disabled':''}>${formatHour(s.time)} · ${s.past?'Ya pasó':s.available?`${s.available} cupo${s.available>1?'s':''}`:'Sin cupos'}</option>`).join('');sel.disabled=false;}catch(e){toast(errMsg(e),'error');}
}
function formatHour(t){const [h,m]=shortTime(t).split(':').map(Number);const am=h<12;const hh=h%12||12;return `${hh}:${pad(m)} ${am?'a. m.':'p. m.'}`;}
async function updateHeroAvailability(){try{const today=todayISO();const d=new Date(`${today}T12:00:00-05:00`);d.setDate(d.getDate()+1);const date=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;const slots=await getAvailability(date);$('#heroOpenSlots').textContent=slots.reduce((a,s)=>a+s.available,0);}catch{$('#heroOpenSlots').textContent='—';}}

async function submitBooking(e){
  e.preventDefault(); const button=e.submitter; button.disabled=true; button.textContent='Guardando...';
  try{
    const phone=normalizePhone($('#clientPhone').value); if(phone.length<7)throw new Error('Ingresa un teléfono válido.');
    const service=state.services.find(s=>s.id===$('#serviceSelect').value); if(!service)throw new Error('Selecciona un servicio.');
    const slots=await getAvailability($('#bookingDate').value);const chosen=slots.find(s=>s.time===$('#bookingTime').value);if(!chosen||chosen.available<1||chosen.past)throw new Error('Ese horario ya no está disponible. Selecciona otro.');
    const {data:customer,error:ce}=await db.from('customers').upsert({full_name:$('#clientName').value.trim(),phone,email:$('#clientEmail').value.trim()||null,updated_at:new Date().toISOString()},{onConflict:'phone'}).select().single();if(ce)throw ce;
    const {data:vehicle,error:ve}=await db.from('vehicles').insert({customer_id:customer.id,make:$('#vehicleMake').value,model:$('#vehicleModel').value,model_year:Number($('#vehicleYear').value),color:$('#vehicleColor').value.trim(),plate:$('#vehiclePlate').value.trim().toUpperCase()||null}).select().single();if(ve)throw ve;
    const start=$('#bookingTime').value;const end=minutesToTime(timeToMinutes(start)+(Number(state.settings.slot_interval_minutes)||120));
    const payload={booking_code:generateCode(),customer_id:customer.id,vehicle_id:vehicle.id,service_id:service.id,appointment_date:$('#bookingDate').value,start_time:start,end_time:end,status:'requested',payment_method:'Paga en el local',payment_status:'pending',subtotal_cop:service.price_cop,customer_notes:$('#customerNotes').value.trim(),updated_at:new Date().toISOString()};
    const {data:booking,error:be}=await db.from('bookings').insert(payload).select().single();if(be)throw be;
    toast(`Reserva ${booking.booking_code} creada correctamente.`);state.currentLookupPhone=phone;$('#lookupPhone').value=phone;await Promise.all([refreshBookingSlots(),updateHeroAvailability(),lookupBookings(phone)]);e.target.reset();initVehicleSelectors();$('#bookingDate').min=todayISO();$('#bookingTime').innerHTML='<option value="">Elige una fecha</option>';$('#bookingTime').disabled=true;$('#bookingSummary strong').textContent='$0 COP';
  }catch(err){toast(errMsg(err),'error');}finally{button.disabled=false;button.textContent='Confirmar solicitud';}
}

async function lookupBookings(forcedPhone=null){
  const phone=normalizePhone(forcedPhone||$('#lookupPhone').value); if(!phone){toast('Ingresa el teléfono de la reserva.','error');return;}
  $('#clientBookings').className='booking-results';$('#clientBookings').innerHTML='<div class="empty-state">Buscando...</div>';
  try{
    const {data:cust,error:ce}=await db.from('customers').select('id,full_name,phone').eq('phone',phone).maybeSingle(); if(ce)throw ce;
    if(!cust){$('#clientBookings').className='booking-results empty-state';$('#clientBookings').textContent='No encontramos reservas asociadas a ese teléfono.';return;}
    const {data,error}=await db.from('bookings').select('*,services(id,name,price_cop),vehicles(make,model,model_year,color,plate)').eq('customer_id',cust.id).order('appointment_date',{ascending:false}).order('start_time',{ascending:false});if(error)throw error;
    state.currentLookupPhone=phone;
    if(!data?.length){$('#clientBookings').className='booking-results empty-state';$('#clientBookings').textContent='No hay reservas registradas.';return;}
    $('#clientBookings').innerHTML=data.map(b=>`<article class="booking-result"><div class="result-top"><div><h3>${escapeHtml(b.services?.name||'Servicio')}</h3><p>${escapeHtml(b.booking_code)} · ${escapeHtml(b.vehicles?.make||'')} ${escapeHtml(b.vehicles?.model||'')}</p></div><span class="status ${b.status}">${statusLabels[b.status]||b.status}</span></div><div class="booking-meta"><div><span>Fecha</span><b>${dateLabel(b.appointment_date)}</b></div><div><span>Hora</span><b>${formatHour(b.start_time)}</b></div><div><span>Total</span><b>${money(b.subtotal_cop)}</b></div><div><span>Pago</span><b>${b.payment_status==='paid'?'Pagado':'En el local'}</b></div></div>${['requested','confirmed'].includes(b.status)?`<button class="btn btn-small btn-ghost edit-booking" data-id="${b.id}">Modificar reserva</button>`:''}</article>`).join('');
    $$('.edit-booking').forEach(btn=>btn.addEventListener('click',()=>openEditBooking(btn.dataset.id,data)));
  }catch(e){$('#clientBookings').className='booking-results empty-state';$('#clientBookings').textContent='No fue posible consultar las reservas.';toast(errMsg(e),'error');}
}
async function openEditBooking(id,bookings){
  const b=bookings.find(x=>x.id===id);if(!b)return;$('#editBookingId').value=id;$('#editBookingTitle').textContent=b.booking_code;$('#editService').value=b.service_id;$('#editDate').value=b.appointment_date;await populateEditSlots(b.appointment_date,b.start_time);$('#editBookingDialog').showModal();
}
async function populateEditSlots(date,current=''){const slots=await getAvailability(date);$('#editTime').innerHTML=slots.map(s=>`<option value="${s.time}" ${(s.time===shortTime(current))?'selected':''} ${(s.available===0||s.past)&&s.time!==shortTime(current)?'disabled':''}>${formatHour(s.time)} · ${s.time===shortTime(current)?'Actual':s.available?`${s.available} cupos`:'Sin cupos'}</option>`).join('');}
async function saveBookingEdit(e){e.preventDefault();try{const id=$('#editBookingId').value;const service=state.services.find(s=>s.id===$('#editService').value);const start=$('#editTime').value;const end=minutesToTime(timeToMinutes(start)+(Number(state.settings.slot_interval_minutes)||120));const {error}=await db.from('bookings').update({service_id:service.id,subtotal_cop:service.price_cop,appointment_date:$('#editDate').value,start_time:start,end_time:end,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;$('#editBookingDialog').close();toast('Reserva actualizada.');await Promise.all([lookupBookings(state.currentLookupPhone),refreshBookingSlots(),updateHeroAvailability()]);}catch(e){toast(errMsg(e),'error');}}
async function cancelBooking(){try{const id=$('#editBookingId').value;const {error}=await db.from('bookings').update({status:'cancelled',updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;$('#editBookingDialog').close();toast('Reserva cancelada.');await Promise.all([lookupBookings(state.currentLookupPhone),refreshBookingSlots(),updateHeroAvailability()]);}catch(e){toast(errMsg(e),'error');}}

async function switchRole(role){
  state.currentRole=role;$$('.role-btn').forEach(b=>b.classList.toggle('active',b.dataset.role===role));$$('.view').forEach(v=>v.classList.remove('active'));$(`#${role}View`).classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(role==='employee')await loadEmployeeDashboard(); if(role==='owner')await loadOwnerDashboard();
}

async function loadEmployeeDashboard(){
  const id=$('#employeePicker').value||state.currentEmployee||state.employees.find(e=>e.active)?.id;if(!id)return;state.currentEmployee=id;$('#employeePicker').value=id;
  const today=todayISO();
  const [{data:entries,error:te},{data:jobs,error:je}]=await Promise.all([
    db.from('time_entries').select('*').eq('employee_id',id).order('clock_in',{ascending:false}).limit(30),
    db.from('bookings').select('*,services(name),customers(full_name,phone),vehicles(make,model,color)').eq('assigned_employee_id',id).eq('appointment_date',today).neq('status','cancelled').order('start_time')
  ]);if(te||je){toast(errMsg(te||je),'error');return;}
  state.activeTimeEntry=(entries||[]).find(x=>!x.clock_out)||null;renderClock();renderAssignments(jobs||[]);renderTimesheet(entries||[]);$('#employeeTodayCount').textContent=jobs?.length||0;$('#employeeTodayHint').textContent=jobs?.length?'Servicios programados':'Sin servicios pendientes';
  const start=new Date();start.setDate(start.getDate()-13);const hours=(entries||[]).filter(x=>new Date(x.clock_in)>=start).reduce((sum,x)=>sum+entryHours(x),0);$('#employeeHours').textContent=hours.toFixed(1);
}
function renderClock(){
  const active=state.activeTimeEntry;$('#clockState').textContent=active?'En turno':'Fuera de turno';$('#clockButton').textContent=active?'Clock out':'Clock in';$('#clockButton').classList.toggle('danger',!!active);updateClockLive();
}
function updateClockLive(){if(state.activeTimeEntry){const sec=Math.max(0,Math.floor((Date.now()-new Date(state.activeTimeEntry.clock_in).getTime())/1000));$('#clockSince').textContent=`${pad(Math.floor(sec/3600))}:${pad(Math.floor(sec%3600/60))}:${pad(sec%60)}`;}else $('#clockSince').textContent='--:--:--';}
function entryHours(x){if(!x.clock_out)return 0;return Math.max(0,(new Date(x.clock_out)-new Date(x.clock_in))/36e5-(Number(x.break_minutes)||0)/60);}
async function toggleClock(){try{if(state.activeTimeEntry){const {error}=await db.from('time_entries').update({clock_out:new Date().toISOString()}).eq('id',state.activeTimeEntry.id);if(error)throw error;toast('Clock out registrado.');}else{const {error}=await db.from('time_entries').insert({employee_id:state.currentEmployee,clock_in:new Date().toISOString()});if(error)throw error;toast('Clock in registrado.');}await loadEmployeeDashboard();}catch(e){toast(errMsg(e),'error');}}
function renderAssignments(rows){
  $('#employeeAssignments').innerHTML=rows.length?rows.map(b=>`<article class="assignment"><div class="time-badge">${formatHour(b.start_time).replace(' ','<br>')}</div><div><h4>${escapeHtml(b.services?.name||'Servicio')} · ${escapeHtml(b.vehicles?.make||'')} ${escapeHtml(b.vehicles?.model||'')}</h4><p>${escapeHtml(b.customers?.full_name||'Cliente')} · ${escapeHtml(b.vehicles?.color||'')} · ${escapeHtml(b.customer_notes||'Sin notas')}</p></div><div class="assignment-actions"><span class="status ${b.status}">${statusLabels[b.status]}</span>${b.status==='confirmed'||b.status==='requested'?`<button class="btn btn-small btn-primary job-status" data-id="${b.id}" data-status="in_progress">Iniciar</button>`:''}${b.status==='in_progress'?`<button class="btn btn-small btn-primary job-status" data-id="${b.id}" data-status="ready">Marcar listo</button>`:''}${b.status==='ready'?`<button class="btn btn-small btn-primary job-status" data-id="${b.id}" data-status="completed">Entregar</button>`:''}</div></article>`).join(''):'<div class="empty-state">No hay servicios asignados hoy.</div>';
  $$('.job-status').forEach(b=>b.addEventListener('click',()=>updateBookingStatus(b.dataset.id,b.dataset.status,'employee')));
}
function renderTimesheet(rows){$('#employeeTimesheet').innerHTML=rows.length?rows.map(x=>`<tr><td>${localDateTime(x.clock_in)}</td><td>${x.clock_out?localDateTime(x.clock_out):'<span class="status in_progress">Activo</span>'}</td><td>${x.break_minutes} min</td><td>${entryHours(x).toFixed(2)}</td></tr>`).join(''):'<tr><td colspan="4">Sin registros todavía.</td></tr>';}

async function loadOwnerDashboard(){await Promise.all([refreshCoreForOwner(),loadOwnerCalendar()]);renderOwnerServices();renderOwnerEmployees();loadEmployeeFile();runPayroll();}
async function refreshCoreForOwner(){
  const today=todayISO();const [{data:emps,error:ee},{data:services,error:se},{data:todayRows,error:be},{data:paid,error:pe}]=await Promise.all([
    db.from('employees').select('*').order('first_name'),db.from('services').select('*').order('sort_order'),db.from('bookings').select('id,status').eq('appointment_date',today).neq('status','cancelled'),db.from('bookings').select('subtotal_cop').eq('payment_status','paid').neq('status','cancelled')
  ]);if(ee||se||be||pe)throw ee||se||be||pe;state.employees=emps||[];state.services=services||[];populateCoreSelects();renderServices();$('#kpiBookings').textContent=todayRows.length;$('#kpiBookingsSub').textContent=`${todayRows.filter(x=>x.status==='requested').length} por confirmar`;$('#kpiInProgress').textContent=todayRows.filter(x=>x.status==='in_progress').length;$('#kpiEmployees').textContent=emps.filter(e=>e.active).length;$('#kpiRevenue').textContent=money((paid||[]).reduce((s,x)=>s+Number(x.subtotal_cop||0),0));
}
async function loadOwnerCalendar(){
  const date=$('#ownerDate').value||todayISO();$('#ownerBookings').innerHTML='<div class="empty-state">Cargando agenda...</div>';
  const {data,error}=await db.from('bookings').select('*,services(name),customers(full_name,phone),vehicles(make,model,color,plate),employees(id,first_name,last_name)').eq('appointment_date',date).order('start_time');if(error){toast(errMsg(error),'error');return;}
  $('#ownerBookings').innerHTML=data?.length?data.map(b=>`<article class="owner-booking"><div class="time-badge">${formatHour(b.start_time).replace(' ','<br>')}</div><div><h4>${escapeHtml(b.services?.name||'Servicio')} · ${escapeHtml(b.customers?.full_name||'Cliente')}</h4><p>${escapeHtml(b.vehicles?.make||'')} ${escapeHtml(b.vehicles?.model||'')} · ${escapeHtml(b.vehicles?.color||'')} ${b.vehicles?.plate?`· ${escapeHtml(b.vehicles.plate)}`:''} · ${money(b.subtotal_cop)}</p></div><div class="owner-actions"><select class="assign-employee" data-id="${b.id}"><option value="">Sin asignar</option>${state.employees.filter(e=>e.active).map(e=>`<option value="${e.id}" ${e.id===b.assigned_employee_id?'selected':''}>${escapeHtml(e.first_name)}</option>`).join('')}</select><select class="owner-status" data-id="${b.id}">${Object.entries(statusLabels).map(([k,v])=>`<option value="${k}" ${k===b.status?'selected':''}>${v}</option>`).join('')}</select><select class="owner-payment" data-id="${b.id}"><option value="pending" ${b.payment_status==='pending'?'selected':''}>Pendiente</option><option value="paid" ${b.payment_status==='paid'?'selected':''}>Pagado</option><option value="refunded" ${b.payment_status==='refunded'?'selected':''}>Reembolsado</option></select></div></article>`).join(''):'<div class="empty-state">No hay reservas para esta fecha.</div>';
  $$('.assign-employee').forEach(el=>el.addEventListener('change',()=>updateBookingField(el.dataset.id,{assigned_employee_id:el.value||null})));$$('.owner-status').forEach(el=>el.addEventListener('change',()=>updateBookingField(el.dataset.id,{status:el.value})));$$('.owner-payment').forEach(el=>el.addEventListener('change',()=>updateBookingField(el.dataset.id,{payment_status:el.value})));
}
async function updateBookingField(id,patch){try{const {error}=await db.from('bookings').update({...patch,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;toast('Reserva actualizada.');await refreshCoreForOwner();}catch(e){toast(errMsg(e),'error');}}
async function updateBookingStatus(id,status,source){await updateBookingField(id,{status});if(source==='employee')await loadEmployeeDashboard();}

function renderOwnerServices(){
  $('#ownerServices').innerHTML=state.services.map(s=>`<div class="editable-row"><div><h4>${escapeHtml(s.name)} <span class="status ${s.active?'ready':'cancelled'}">${s.active?'Activo':'Oculto'}</span></h4><p>${money(s.price_cop)} · ${s.duration_minutes} min · ${escapeHtml(s.category)}</p></div><div class="editable-actions"><button class="btn btn-small btn-ghost service-price" data-id="${s.id}">Precio</button><button class="btn btn-small ${s.active?'danger':'btn-primary'} service-toggle" data-id="${s.id}" data-active="${s.active}">${s.active?'Ocultar':'Activar'}</button></div></div>`).join('');
  $$('.service-price').forEach(b=>b.addEventListener('click',async()=>{const s=state.services.find(x=>x.id===b.dataset.id);const val=prompt(`Nuevo precio COP para ${s.name}:`,s.price_cop);if(val===null)return;const n=Number(val);if(!Number.isFinite(n)||n<0)return toast('Precio inválido.','error');await saveServicePatch(s.id,{price_cop:n});}));
  $$('.service-toggle').forEach(b=>b.addEventListener('click',()=>saveServicePatch(b.dataset.id,{active:b.dataset.active!=='true'})));
}
async function saveServicePatch(id,patch){try{const {error}=await db.from('services').update({...patch,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;toast('Servicio actualizado.');await refreshCoreForOwner();renderOwnerServices();}catch(e){toast(errMsg(e),'error');}}
async function addService(e){e.preventDefault();try{const payload={name:$('#newServiceName').value.trim(),category:$('#newServiceCategory').value.trim(),description:$('#newServiceDescription').value.trim(),duration_minutes:Number($('#newServiceDuration').value),price_cop:Number($('#newServicePrice').value),active:true,sort_order:state.services.length+1};const {error}=await db.from('services').insert(payload);if(error)throw error;e.target.reset();$('#newServiceCategory').value='Detailing';$('#newServiceDuration').value=120;toast('Servicio agregado.');await refreshCoreForOwner();renderOwnerServices();}catch(e){toast(errMsg(e),'error');}}

function renderOwnerEmployees(){
  $('#ownerEmployees').innerHTML=state.employees.map(e=>`<div class="editable-row"><div><h4>${escapeHtml(e.first_name)} ${escapeHtml(e.last_name)} <span class="status ${e.active?'ready':'cancelled'}">${e.active?'Activo':'Inactivo'}</span></h4><p>${escapeHtml(e.position)} · ${money(e.hourly_rate_cop)}/hora</p></div><div class="editable-actions"><button class="btn btn-small btn-ghost employee-rate" data-id="${e.id}">Tarifa</button><button class="btn btn-small ${e.active?'danger':'btn-primary'} employee-toggle" data-id="${e.id}" data-active="${e.active}">${e.active?'Desactivar':'Activar'}</button></div></div>`).join('');
  $$('.employee-rate').forEach(b=>b.addEventListener('click',async()=>{const e=state.employees.find(x=>x.id===b.dataset.id);const val=prompt(`Nueva tarifa por hora COP para ${e.first_name}:`,e.hourly_rate_cop);if(val===null)return;const n=Number(val);if(!Number.isFinite(n)||n<0)return toast('Tarifa inválida.','error');await saveEmployeePatch(e.id,{hourly_rate_cop:n});}));
  $$('.employee-toggle').forEach(b=>b.addEventListener('click',()=>saveEmployeePatch(b.dataset.id,{active:b.dataset.active!=='true'})));
}
async function saveEmployeePatch(id,patch){try{const {error}=await db.from('employees').update({...patch,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;toast('Empleado actualizado.');await refreshCoreForOwner();renderOwnerEmployees();}catch(e){toast(errMsg(e),'error');}}
async function addEmployee(e){e.preventDefault();try{const {data:emp,error}=await db.from('employees').insert({first_name:$('#newEmployeeFirst').value.trim(),last_name:$('#newEmployeeLast').value.trim(),phone:normalizePhone($('#newEmployeePhone').value)||null,position:$('#newEmployeePosition').value.trim(),hourly_rate_cop:Number($('#newEmployeeRate').value),active:true}).select().single();if(error)throw error;const rows=Array.from({length:7},(_,day)=>({employee_id:emp.id,day_of_week:day,start_time:state.settings.open_time,end_time:state.settings.close_time,is_working:true}));await db.from('work_schedules').insert(rows);e.target.reset();$('#newEmployeePosition').value='Detailer';$('#newEmployeeRate').value=18000;toast('Empleado agregado.');await refreshCoreForOwner();renderOwnerEmployees();}catch(e){toast(errMsg(e),'error');}}
async function loadEmployeeFile(){
  const id=$('#employeeFilePicker').value||state.employees[0]?.id;if(!id)return;$('#employeeFilePicker').value=id;
  const [{data:notes,error:ne},{data:history,error:he}]=await Promise.all([db.from('employee_notes').select('*').eq('employee_id',id).order('created_at',{ascending:false}),db.from('bookings').select('appointment_date,start_time,status,services(name),customers(full_name),vehicles(make,model)').eq('assigned_employee_id',id).order('appointment_date',{ascending:false}).limit(30)]);if(ne||he){toast(errMsg(ne||he),'error');return;}
  $('#employeeNotes').innerHTML=notes?.length?notes.map(n=>`<div class="note-item">${escapeHtml(n.note)}<small>${localDateTime(n.created_at)}</small></div>`).join(''):'<div class="empty-state">Sin notas.</div>';
  $('#employeeHistory').innerHTML=history?.length?history.map(h=>`<div class="history-item"><b>${escapeHtml(h.services?.name||'Servicio')}</b> · ${escapeHtml(h.customers?.full_name||'Cliente')}<small>${dateLabel(h.appointment_date)} · ${escapeHtml(h.vehicles?.make||'')} ${escapeHtml(h.vehicles?.model||'')} · ${statusLabels[h.status]}</small></div>`).join(''):'<div class="empty-state">Sin historial asignado.</div>';
}
async function addEmployeeNote(){const employee_id=$('#employeeFilePicker').value,note=$('#employeeNoteInput').value.trim();if(!note)return;try{const {error}=await db.from('employee_notes').insert({employee_id,note});if(error)throw error;$('#employeeNoteInput').value='';toast('Nota guardada.');await loadEmployeeFile();}catch(e){toast(errMsg(e),'error');}}

async function runPayroll(){
  const start=$('#payrollStart').value,end=$('#payrollEnd').value;if(!start||!end)return;
  try{
    const startISO=`${start}T00:00:00-05:00`, endISO=`${end}T23:59:59-05:00`;
    const [{data:entries,error:te},{data:adjust,error:ae}]=await Promise.all([db.from('time_entries').select('*').gte('clock_in',startISO).lte('clock_in',endISO),db.from('payroll_adjustments').select('*').lte('period_start',end).gte('period_end',start)]);if(te||ae)throw te||ae;
    $('#payrollTable').innerHTML=state.employees.filter(e=>e.active).map(emp=>{const hrs=(entries||[]).filter(x=>x.employee_id===emp.id).reduce((s,x)=>s+entryHours(x),0);const base=Math.round(hrs*emp.hourly_rate_cop);const adj=(adjust||[]).filter(x=>x.employee_id===emp.id).reduce((s,x)=>s+(x.adjustment_type==='bonus'?1:-1)*Number(x.amount_cop),0);return `<tr><td>${escapeHtml(emp.first_name)} ${escapeHtml(emp.last_name)}</td><td>${hrs.toFixed(2)}</td><td>${money(emp.hourly_rate_cop)}</td><td>${money(base)}</td><td>${money(adj)}</td><td><b>${money(Math.max(0,base+adj))}</b></td></tr>`;}).join('');
  }catch(e){toast(errMsg(e),'error');}
}
function updatePayrollRange(){const end=$('#payrollEnd').value||todayISO();const d=new Date(`${end}T12:00:00-05:00`);d.setDate(d.getDate()-($('#payrollCycle').value==='biweekly'?13:6));$('#payrollStart').value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;runPayroll();}

async function saveSettings(e){e.preventDefault();try{const patch={phone:$('#settingPhone').value.trim(),address:$('#settingAddress').value.trim(),open_time:$('#settingOpen').value,close_time:$('#settingClose').value,slot_interval_minutes:Number($('#settingInterval').value),slot_capacity:Number($('#settingCapacity').value),payroll_cycle:$('#settingPayroll').value,updated_at:new Date().toISOString()};const {data,error}=await db.from('business_settings').update(patch).eq('id',state.settings.id).select().single();if(error)throw error;state.settings=data;applySettings();toast('Configuración guardada.');await updateHeroAvailability();}catch(e){toast(errMsg(e),'error');}}

function setupEvents(){
  $$('.role-btn').forEach(b=>b.addEventListener('click',()=>switchRole(b.dataset.role)));
  $('#bookingDate').addEventListener('change',refreshBookingSlots);$('#serviceSelect').addEventListener('change',()=>{const s=state.services.find(x=>x.id===$('#serviceSelect').value);$('#bookingSummary strong').textContent=s?money(s.price_cop):'$0 COP';});$('#bookingForm').addEventListener('submit',submitBooking);$('#lookupBtn').addEventListener('click',()=>lookupBookings());$('#lookupPhone').addEventListener('keydown',e=>{if(e.key==='Enter')lookupBookings();});
  $('#editDate').addEventListener('change',()=>populateEditSlots($('#editDate').value));$('#editBookingForm').addEventListener('submit',saveBookingEdit);$('#cancelBookingBtn').addEventListener('click',cancelBooking);
  $('#employeePicker').addEventListener('change',()=>{state.currentEmployee=$('#employeePicker').value;loadEmployeeDashboard();});$('#clockButton').addEventListener('click',toggleClock);$('#refreshEmployee').addEventListener('click',loadEmployeeDashboard);
  $$('.owner-tab').forEach(b=>b.addEventListener('click',()=>{$$('.owner-tab').forEach(x=>x.classList.remove('active'));$$('.owner-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(`#tab-${b.dataset.tab}`).classList.add('active');if(b.dataset.tab==='payroll')runPayroll();if(b.dataset.tab==='employees')loadEmployeeFile();}));
  $('#ownerDate').addEventListener('change',loadOwnerCalendar);$('#serviceForm').addEventListener('submit',addService);$('#employeeForm').addEventListener('submit',addEmployee);$('#employeeFilePicker').addEventListener('change',loadEmployeeFile);$('#addEmployeeNote').addEventListener('click',addEmployeeNote);$('#runPayroll').addEventListener('click',runPayroll);$('#payrollCycle').addEventListener('change',updatePayrollRange);$('#settingsForm').addEventListener('submit',saveSettings);
  setInterval(()=>{updateClockLive();if(state.currentRole==='client'&&$('#bookingDate').value)refreshBookingSlots();},15000);
}
function observeReveals(){const io=new IntersectionObserver(entries=>entries.forEach(x=>{if(x.isIntersecting)x.target.classList.add('visible')}),{threshold:.12});$$('.reveal').forEach(el=>io.observe(el));}

async function init(){
  initVehicleSelectors();setupEvents();observeReveals();
  try{await loadCore();}catch(e){toast(`No se pudo conectar con la base de datos: ${errMsg(e)}`,'error');}
  setTimeout(()=>$('#splash').classList.add('done'),1200);
}
init();