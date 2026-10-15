/* Agri-SECA browser engine 0.1.0. GPL-3.0-or-later.
   Port of the audited Python restricted fixed-root workflow. */
(function(root){
'use strict';
const VERSION='0.1.0-web';
const clip=(x,a,b)=>Math.min(b,Math.max(a,x));
const sum=a=>a.reduce((s,x)=>s+x,0);
const finite=(x,n)=>{if(!Number.isFinite(x))throw Error(n+': valor inválido.');return x;};
const canonical=o=>JSON.stringify(o,Object.keys(o).sort());
function dateParts(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Data inválida: '+s);const d=new Date(s+'T00:00:00Z');if(!Number.isFinite(+d)||d.toISOString().slice(0,10)!==s)throw Error('Data inválida: '+s);return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),time:+d};}
function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');const line=text.split(/\r?\n/)[0];const sep=line.includes(';')?';':',';
 const rows=[];let row=[],v='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){v+='"';i++;}else quoted=!quoted;}else if(c===sep&&!quoted){row.push(v.trim());v='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(v.trim());if(row.some(x=>x!==''))rows.push(row);row=[];v='';}else v+=c;}
 if(quoted)throw Error('CSV com aspas não fechadas.');row.push(v.trim());if(row.some(x=>x!==''))rows.push(row);
 if(rows.length<2)throw Error('O CSV precisa de cabeçalho e dados.');const headers=rows.shift();if(new Set(headers).size!==headers.length)throw Error('Cabeçalhos duplicados.');
 return rows.map((r,i)=>{if(r.length!==headers.length)throw Error('Número de colunas incorreto na linha '+(i+2));return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
function weatherFromCSV(text){
 const rows=parseCSV(text), required=['date','P_mm','ET0_mm','u2_m_s','RHmin_pct'];for(const k of required)if(!(k in rows[0]))throw Error('Falta a coluna '+k+'. O balanço requer dados diários.');
 const groups=Object.create(null);for(const row of rows){const id=(row.station_id||'Local 1').trim();if(!id)throw Error('Identificador vazio.');if(!groups[id])groups[id]=[];const r={date:row.date};for(const k of required.slice(1)){if(row[k]==='')throw Error('Valor em falta: '+k+' em '+row.date);r[k]=finite(Number(row[k].replace(',','.')),k);}groups[id].push(r);}for(const [id,g] of Object.entries(groups))validateWeather(g,id);return groups;
}
function validateWeather(w,id='Local'){
 if(!w.length)throw Error(id+': sem dados.');let prev=null;
 for(const r of w){const d=dateParts(r.date);if(prev!==null&&d.time-prev!==86400000)throw Error(id+': datas devem estar ordenadas, sem duplicados ou dias em falta ('+r.date+').');prev=d.time;for(const k of ['P_mm','ET0_mm','u2_m_s','RHmin_pct'])finite(r[k],id+' / '+k);if(r.P_mm<0||r.ET0_mm<0||r.u2_m_s<0||r.RHmin_pct<0||r.RHmin_pct>100)throw Error(id+': precipitação/ET0/vento negativos ou RH fora de 0–100.');}
}
function geometry(c){
 const s=c.soil,k=c.crop;for(const [n,v]of Object.entries(s))finite(v,n);for(const n of ['root_depth_m','cover','height_m','p'])finite(k[n],n);
 if(!(0<s.theta_wp&&s.theta_wp<s.theta_fc&&s.theta_fc<s.theta_sat&&s.theta_sat<=.8))throw Error('Solo: requer 0 < θWP < θFC < θSAT ≤ 0,8.');
 if(!(s.ze_m>0&&s.ze_m<k.root_depth_m))throw Error('Ze deve ser positivo e inferior à profundidade radicular.');
 if(!(k.cover>=0&&k.cover<=1&&k.height_m>0&&k.p>0&&k.p<1))throw Error('Parâmetros da cultura inválidos.');
 const dz=[s.ze_m,s.ze_m,k.root_depth_m-s.ze_m];const fc=dz.map(z=>1000*z*s.theta_fc),wp=dz.map(z=>1000*z*s.theta_wp),sat=dz.map(z=>1000*z*s.theta_sat);const floor=[.5*wp[0],.5*wp[1],wp[2]];const tew=fc[0]-floor[0];
 if(!(s.rew_mm>=0&&s.rew_mm<tew))throw Error('REW tem de estar entre 0 e TEW ('+tew.toFixed(2)+' mm).');
 if(!Number.isInteger(c.numerics.et_substeps)||c.numerics.et_substeps<1||c.numerics.et_substeps>96)throw Error('Subpassos: inteiro de 1 a 96.');
 if(!['rain_et','et_rain','uniform'].includes(c.numerics.rain_timing))throw Error('Ordem de chuva inválida.');
 if(c.runoff.method==='scs_cn_fixed'){if(!(c.runoff.cn>0&&c.runoff.cn<=100&&c.runoff.initial_abstraction_ratio>=0&&c.runoff.initial_abstraction_ratio<=1))throw Error('CN ou abstração inicial inválidos.');}else if(c.runoff.method!=='none_control')throw Error('Método de escoamento inválido.');
 return {fc,wp,sat,floor,tew,area:[1-k.cover,k.cover,1],taw:1000*(s.theta_fc-s.theta_wp)*k.root_depth_m};
}
function validateConfig(c,kcb){geometry(c);if(kcb.length!==12||kcb.some(x=>!Number.isFinite(x)||x<0||x>2))throw Error('São necessários 12 Kcb entre 0 e 2.');const s=c.spinup;if(!Number.isInteger(s.years)||s.years<1||!Number.isInteger(s.max_cycles)||s.max_cycles<2||!(s.tolerance_mm>0&&s.tolerance_mm<=.1))throw Error('Spin-up inválido.');const r=c.reference;if(![r.start_year,r.end_year,r.min_years].every(Number.isInteger)||r.end_year<r.start_year||r.min_years<2)throw Error('Período de referência inválido.');dateParts(c.analysis_start);}
function initial(g,wet){return (wet?g.fc:g.floor).slice();}
function storage(w,g){return sum(w.map((v,j)=>v*g.area[j]));}
function diag(w,g){const asw=sum(w.map((v,j)=>g.area[j]*Math.max(0,Math.min(v,g.fc[j])-g.wp[j])));return {TAW:g.taw,available_water:asw,Dr:Math.max(0,g.taw-asw)};}
const ksValue=(d,p)=>d.Dr<=p*d.TAW?1:clip(d.available_water/((1-p)*d.TAW),0,1);
function step(input,r,c,kcb,g){
 const w=input.slice(),before=storage(w,g),few=g.area[0],k=c.crop,steps=c.numerics.et_substeps;
 let ro=0;if(c.runoff.method==='scs_cn_fixed'){const s=25400/c.runoff.cn-254,ex=r.P_mm-c.runoff.initial_abstraction_ratio*s;ro=ex>0?ex*ex/(ex+s):0;}
 const infiltration=r.P_mm-ro,u=clip(r.u2_m_s,1,6),rh=clip(r.RHmin_pct,20,80);
 const kcmax=Math.max(1.2+(.04*(u-2)-.004*(rh-45))*Math.pow(k.height_m/3,.3),kcb+.05);
 let dp=0,T=0,E=0,p=k.p,ksSum=0,limited=false;
 function cascade(limits){let flow=0;for(let j=0;j<2;j++){const ex=Math.max(0,w[j]-limits[j]);w[j]-=ex;flow+=g.area[j]*ex;}w[2]+=flow;const ex=Math.max(0,w[2]-limits[2]);w[2]-=ex;dp+=ex;}
 function wet(q){w[0]+=q;w[1]+=q;cascade(g.sat);}
 for(let s=0;s<steps;s++){
  const rain=c.numerics.rain_timing==='uniform'?infiltration/steps:(s===0&&c.numerics.rain_timing==='rain_et'?infiltration:0);if(rain>0)wet(rain);
  const de=few>0?Math.max(0,g.fc[0]-w[0]):0;
  const kr=de<=c.soil.rew_mm?1:clip((g.tew-de)/(g.tew-c.soil.rew_mm),0,1);
  const ke=Math.max(0,Math.min(kr*(kcmax-kcb),few*kcmax));
  p=k.adjust_p?clip(k.p+.04*(5-(kcb+ke)*r.ET0_mm),.1,.8):k.p;
  const ks=ksValue(diag(w,g),p);ksSum+=ks;
  const tp=kcb*r.ET0_mm/steps,requestE=ke*r.ET0_mm/steps;
  const e=Math.min(requestE,Math.max(0,(w[0]-g.floor[0])*few));if(few>0)w[0]-=e/few;
  const pool=w.map((v,j)=>Math.max(0,v-g.wp[j])*g.area[j]),supply=sum(pool);
  const t=Math.min(ks*tp,supply);for(let j=0;j<3;j++)if(g.area[j]>0&&supply>0)w[j]-=pool[j]*(t/supply)/g.area[j];
  T+=t;E+=e;if(t<ks*tp-1e-10||e<requestE-1e-10)limited=true;
 }
 if(c.numerics.rain_timing==='et_rain'&&infiltration>0)wet(infiltration);cascade(g.fc);
 const S=storage(w,g),delta=S-before,error=r.P_mm-ro-dp-T-E-delta;
 if(Math.abs(error)>1e-8||w.some((v,j)=>!Number.isFinite(v)||v<g.floor[j]-1e-8||v>g.fc[j]+1e-8))throw Error('Falha de conservação ou limites físicos em '+r.date);
 const d=diag(w,g),tp=kcb*r.ET0_mm;
 return {state:w,result:{date:r.date,P:r.P_mm,ET0:r.ET0_mm,Kcb:kcb,Kcmax:kcmax,Ke:r.ET0_mm>0?E/r.ET0_mm:0,Ks:tp>0?T/tp:ksSum/steps,
  ...d,RAW:p*d.TAW,p,De:few?Math.max(0,g.fc[0]-w[0]):0,TEW:g.tew,REW:c.soil.rew_mm,
  runoff:ro,infiltration,transpiration_potential:tp,transpiration_actual:T,soil_evaporation:E,ETa:T+E,
  transpiration_deficit:tp-T,deep_percolation:dp,soil_water:S,soil_water_start:before,delta_storage:delta,mass_balance_error:error,
  water_volume_0_local_mm:w[0],water_volume_1_local_mm:w[1],water_volume_2_local_mm:w[2],
  flux_limited:limited,kc_climate_bounded:!(r.u2_m_s>=1&&r.u2_m_s<=6&&r.RHmin_pct>=20&&r.RHmin_pct<=80)}};
}
function simulate(weather,c,kcb,state,collect=true){const g=geometry(c),daily=[];for(const r of weather){const o=step(state,r,c,kcb[Number(r.date.slice(5,7))-1],g);state=o.state;if(collect)daily.push(o.result);}return {state,daily};}
function spinup(w,c,kcb){
 const first=dateParts(w[0].date),a=dateParts(c.analysis_start),end=first.year+c.spinup.years;
 if(first.month!==1||first.day!==1||a.month!==1||a.day!==1)throw Error('A meteorologia e a análise devem começar a 1 de janeiro.');
 if(end>a.year||w[w.length-1].date<c.analysis_start)throw Error('Faltam anos completos de spin-up anteriores à análise.');
 const block=w.filter(r=>Number(r.date.slice(0,4))<end),g=geometry(c);let dry=initial(g,false),wet=initial(g,true);const history=[];
 for(let cycle=1;cycle<=c.spinup.max_cycles;cycle++){const bd=dry.slice(),bw=wet.slice();dry=simulate(block,c,kcb,dry,false).state;wet=simulate(block,c,kcb,wet,false).state;
  const spread=Math.max(...dry.map((v,j)=>Math.abs(v-wet[j]))),change=Math.max(...dry.map((v,j)=>Math.abs(v-bd[j])),...wet.map((v,j)=>Math.abs(v-bw[j])));history.push({cycle,spread_mm:spread,boundary_change_mm:change});
  if(cycle>=2&&Math.max(spread,change)<=c.spinup.tolerance_mm)return {state:dry,history};
 }throw Error('Spin-up sem convergência: rever dados ou parâmetros.');
}
function aggregate(daily){
 const groups={};for(const r of daily){const m=r.date.slice(0,7);(groups[m]??=[]).push(r);}
 return Object.entries(groups).map(([month,g])=>{const year=Number(month.slice(0,4)),cm=Number(month.slice(5,7)),n=g.length,first=g[0],last=g[n-1];const total=k=>sum(g.map(r=>r[k])),tp=total('transpiration_potential'),ta=total('transpiration_actual');
 const r={month,year,calendar_month:cm,n_days:n,complete_month:n===new Date(Date.UTC(year,cm,0)).getUTCDate(),ASW_mean_mm:total('available_water')/n,ASW_end_mm:last.available_water,TAW_mm:first.TAW,ASW_fraction_mean:total('available_water')/n/first.TAW,Kcb:first.Kcb,
 stress_days:g.filter(r=>r.transpiration_potential>0&&r.Ks<1-1e-9).length,demand_days:g.filter(r=>r.transpiration_potential>0).length,transpiration_deficit_fraction:tp>0?(tp-ta)/tp:null,
 storage_start_mm:first.soil_water_start,storage_end_mm:last.soil_water,max_mass_residual_mm:Math.max(...g.map(r=>Math.abs(r.mass_balance_error))),climate_bounded_days:g.filter(r=>r.kc_climate_bounded).length,flux_limited_days:g.filter(r=>r.flux_limited).length};
 for(const k of ['P','ET0','runoff','infiltration','transpiration_potential','transpiration_actual','soil_evaporation','ETa','deep_percolation','delta_storage','mass_balance_error'])r[k+'_mm']=total(k);return r;});
}
function roundEven6(x){let y=x*1e6,n=Math.floor(y),f=y-n;return (Math.abs(f-.5)<1e-9?(n%2===0?n:n+1):Math.round(y))/1e6;}
function modelKey(c,kcb,site){return JSON.stringify({engine:VERSION,site,soil:c.soil,crop:c.crop,runoff:c.runoff,numerics:c.numerics,spinup:c.spinup,kcb});}
function fitReference(monthly,c,key){const rc=c.reference,out={version:1,engine:VERSION,variable:'ASW_mean_mm',method:'empirical_midrank_bounded_v1',model_key:key,...rc,short_baseline:rc.min_years<30,months:{}};
 for(let m=1;m<=12;m++){const rows=monthly.filter(r=>r.calendar_month===m&&r.complete_month&&r.year>=rc.start_year&&r.year<=rc.end_year);if(rows.length<rc.min_years)throw Error('Mês '+m+': referência requer '+rc.min_years+' anos completos; existem '+rows.length+'.');out.months[m]={values_mm:rows.map(r=>roundEven6(r.ASW_mean_mm)).sort((a,b)=>a-b),years:rows.map(r=>r.year)};}return out;}
function applyReference(monthly,ref,key){if(ref.model_key!==key||ref.engine!==VERSION)throw Error('Referência incompatível com local, Kcb ou parâmetros físicos.');for(let m=1;m<=12;m++){const v=ref.months?.[m]?.values_mm;if(!Array.isArray(v)||v.length<2||v.some((x,i)=>!Number.isFinite(x)||(i&&x<v[i-1])))throw Error('Referência inválida no mês '+m);}
 return monthly.map(r=>{const v=ref.months[r.calendar_month].values_mm,x=roundEven6(r.ASW_mean_mm),n=v.length,L=v.filter(a=>a<x).length,E=v.filter(a=>a===x).length,unique=new Set(v).size;let flag=!r.complete_month?'incomplete_month':x<v[0]?'below_reference_range':x>v[n-1]?'above_reference_range':'within_reference_range';if(unique===1)flag+=';constant_reference';return {...r,ASW_percentile:r.complete_month?100*(L+E*.5+.5)/(n+1):null,reference_tie_fraction:E/n,reference_n_years:n,reference_unique_values:unique,percentile_flag:flag,reference_role:r.year>=ref.start_year&&r.year<=ref.end_year?'in_reference':r.year>ref.end_year?'after_reference':'before_reference'};});}
function run(weather,c,kcb,site='Local 1',frozen=null){validateWeather(weather,site);validateConfig(c,kcb);const spin=spinup(weather,c,kcb),simulation=simulate(weather,c,kcb,spin.state);const daily=simulation.daily.map(r=>({...r,is_analysis:r.date>=c.analysis_start}));let monthly=aggregate(daily.filter(r=>r.is_analysis));const key=modelKey(c,kcb,site),reference=frozen||fitReference(monthly,c,key);monthly=applyReference(monthly,reference,key);let maxResidual=0;for(const r of daily)maxResidual=Math.max(maxResidual,Math.abs(r.mass_balance_error));return {site,daily,monthly,reference,spinup:spin.history,config:c,kcb,metadata:{engine:VERSION,n_days:daily.length,max_mass_residual_mm:maxResidual,field_validated:false,reference_reused:!!frozen}};}
function toCSV(rows){if(!rows.length)return '';const keys=Object.keys(rows[0]),escape=x=>{if(x===null||x===undefined)return '';let s=String(x);if(typeof x==='string'&&/^[=+@-]/.test(s))s="'"+s;return /[",\r\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};return '\uFEFF'+keys.join(',')+'\n'+rows.map(r=>keys.map(k=>escape(r[k])).join(',')).join('\n');}
root.AgriEngine={VERSION,parseCSV,weatherFromCSV,validateWeather,validateConfig,geometry,initial,step,simulate,spinup,aggregate,modelKey,fitReference,applyReference,run,toCSV};
if(typeof module!=='undefined')module.exports=root.AgriEngine;
})(typeof self!=='undefined'?self:globalThis);
