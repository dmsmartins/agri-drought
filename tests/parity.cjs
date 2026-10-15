const fs=require('node:fs'),assert=require('node:assert/strict');
const E=require('../src/engine.cjs');
const path=require('node:path');const ROOT=path.resolve(__dirname,'..');
const demo=JSON.parse(fs.readFileSync(ROOT+'/src/demo-data.json','utf8'));
const golden=JSON.parse(fs.readFileSync(ROOT+'/tests/python-reference.json','utf8'));
const config=demo.config,kcb=demo.kcb;
const weather=demo.weather.map(a=>({date:a[0],P_mm:a[1],ET0_mm:a[2],u2_m_s:a[3],RHmin_pct:a[4]}));
const start=performance.now(),r=E.run(weather,config,kcb,'Local 1');
const cols=golden.columns;const expected=golden.daily.map(a=>Object.fromEntries(cols.map((k,j)=>[k,a[j]])));
const errors=Object.fromEntries(cols.map(k=>[k,0]));
assert.equal(r.daily.length,expected.length);
for(let i=0;i<expected.length;i++)for(const k of cols)errors[k]=Math.max(errors[k],Math.abs(r.daily[i][k]-Number(expected[i][k])));
for(const k of cols)assert.ok(errors[k]<1e-8,k+': '+errors[k]);
const monthly=golden.monthly.map(a=>({month:a[0],ASW_percentile:a[1]}));
let percentileError=0;for(let i=0;i<monthly.length;i++){assert.equal(r.monthly[i].month,monthly[i].month);percentileError=Math.max(percentileError,Math.abs(r.monthly[i].ASW_percentile-Number(monthly[i].ASW_percentile)));}
assert.ok(percentileError<1e-9);
const report={passed:true,daily_rows:r.daily.length,monthly_rows:r.monthly.length,max_abs_difference_by_variable:errors,max_percentile_difference:percentileError,seconds:(performance.now()-start)/1000,reference:'Python Agri-SECA Kcb mensal v0.1, synthetic 1980–2025; not field validation'};
fs.writeFileSync(ROOT+'/tests/parity-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
