const fs=require('node:fs'),assert=require('node:assert/strict'),E=require('../src/engine.cjs'),I=require('../src/indices.cjs'),demo=require('../src/demo-data.json');
const weather=demo.weather.map(a=>({date:a[0],P_mm:a[1],ET0_mm:a[2],u2_m_s:a[3],RHmin_pct:a[4]}));
const r=E.run(weather,demo.config,demo.kcb,'DEMO_A'),monthly=E.aggregate(r.daily),checks=[];
for(const scale of [1,3,6,12]){
 const opts={scale,start:1985,end:2014,minYears:30,minDemand:1,analysisStart:'1985-01'};
 const x=I.calculate(monthly,opts);
 assert.equal(x.raw.length,492);
 for(const [name,series]of Object.entries(x.series)){assert.equal(series.length,492);assert.ok(series.every(v=>v.value===null||Number.isFinite(v.value)));}
 const c=I.compare(x.series.RT,x.series.SPI_EMP,{start:'2015-01',end:'2025-12',threshold:-1,minDuration:1});
 assert.ok(c.valid_months>0);assert.ok(c.matches.every(m=>m.lead_confirmation_months===null||Number.isFinite(m.lead_confirmation_months)));
 checks.push({scale,months:x.raw.length,RT_valid:x.series.RT.filter(x=>Number.isFinite(x.value)).length,comparison_valid_months:c.valid_months,passed:true});
}
const report={data:'synthetic demonstration only; not independent validation',physics_engine:E.VERSION,indices_engine:I.VERSION,checks};
fs.writeFileSync(__dirname+'/indices-integration-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
