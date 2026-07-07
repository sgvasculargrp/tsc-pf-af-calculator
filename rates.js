/* ============================================================
   PF & AF Calculator — rate tables + fee engine
   Ported from the Google Apps Script "Dashboard Edition".
   Depends on window.MOH_DATA, window.AIA_DATA. Exposes window.CALC.
   ============================================================ */
(function () {
  "use strict";
  var MOH = window.MOH_DATA || {};
  var AIA = window.AIA_DATA || {};
  var NPE = window.NTUCEXT_DATA || {};
  var MSL = window.MHCSL_DATA || {};

  function round2(n){ return Math.round((n + Number.EPSILON) * 100) / 100; }
  function look(code){ return code ? MOH[String(code).trim().toUpperCase()] : null; }
  function lookAia(code){ return code ? AIA[String(code).trim().toUpperCase()] : null; }
  function lookNpe(code){ return code ? NPE[String(code).trim().toUpperCase()] : null; }
  var NUM = function(v){ return typeof v === "number" && isFinite(v); };
  var IN = function(t, arr){ return arr.indexOf(t) !== -1; };
  var HIGH = ["6A","6B","6C","7A","7B","7C"];
  var NTUC_ASST = ["4A","4B","4C","5A","5B","5C","6A","6B","6C","7A","7B","7C"];
  var NA="N/A", NP="Not Payable", NAP="Not Applicable", DASH="\u2014", NF="TOSP not found";

  // ---- embedded rate tables --------------------------------------------
  var AIA_AF_PCT = {"1A":.30,"1B":.30,"1C":.30,"2A":.30,"2B":.30,"2C":.30,"3A":.25,"3B":.25,"3C":.25,"4A":.25,"4B":.25,"4C":.25,"5A":.25,"5B":.25,"5C":.25,"6A":.20,"6B":.20,"6C":.20,"7A":.20,"7B":.20,"7C":.20};
  var AIA_PF_CAPS = {"1A":560,"1B":780,"1C":950,"2A":1200,"2B":1600,"2C":2000,"3A":2400,"3B":3200,"3C":4000,"4A":4500,"4B":5200,"4C":7000,"5A":8000,"5B":9100,"5C":9800,"6A":11400,"6B":12400,"6C":13500,"7A":16600,"7B":18300,"7C":20300};
  var GE_HC_PF_CAPS = {"1A":500,"1B":700,"1C":850,"2A":1050,"2B":1350,"2C":1800,"3A":2200,"3B":2850,"3C":3500,"4A":4000,"4B":4650,"4C":5250,"5A":5750,"5B":6500,"5C":7000,"6A":8500,"6B":9200,"6C":10000,"7A":11000,"7B":12000,"7C":13500};
  var NTUC_PANEL_PF_CAPS = {"MSP":450,"1A":600,"1B":800,"1C":1000,"2A":1400,"2B":1800,"2C":2200,"3A":2700,"3B":3600,"3C":4400,"4A":5000,"4B":5700,"4C":6300,"5A":7000,"5B":7900,"5C":8600,"6A":10400,"6B":11400,"6C":12400,"7A":13400,"7B":15000,"7C":16400};
  var SINGLIFE_FALLBACK_PF = {"MSP":350,"1A":500,"1B":860,"1C":1050,"2A":1350,"2B":1720,"2C":2280,"3A":2710,"3B":3570,"3C":4430,"4A":5040,"4B":5780,"4C":6400,"5A":7010,"5B":8000,"5C":8610,"6A":10460,"6B":11440,"6C":12420,"7A":13410,"7B":14760,"7C":16480};
  var SINGLIFE_FALLBACK_AF = {"MSP":0,"1A":500,"1B":550,"1C":550,"2A":550,"2B":550,"2C":570,"3A":680,"3B":890,"3C":1110,"4A":1260,"4B":1450,"4C":1600,"5A":1750,"5B":2000,"5C":2150,"6A":2620,"6B":2860,"6C":3110,"7A":3350,"7B":3690,"7C":4120};
  var ALLIANCE_FALLBACK_PF = {"1A":460,"1B":735,"1C":783,"2A":828,"2B":1104,"2C":1688,"3A":1900,"3B":2452,"3C":2916,"4A":3266,"4B":3855,"4C":4264,"5A":4664,"5B":6302,"5C":6417,"6A":7953,"6B":9177,"6C":9789,"7A":10853,"7B":11174,"7C":11491};
  var IHP_SURGEON_FEES = {"1A":{s1:450,s3:360},"1B":{s1:700,s3:510},"1C":{s1:1000,s3:630},"2A":{s1:1300,s3:950},"2B":{s1:1650,s3:1200},"2C":{s1:1800,s3:1500},"3A":{s1:2350,s3:1980},"3B":{s1:2950,s3:2400},"3C":{s1:3600,s3:3000},"4A":{s1:4000,s3:3500},"4B":{s1:4900,s3:4000},"4C":{s1:5500,s3:4500},"5A":{s1:6200,s3:5000},"5B":{s1:7100,s3:5600},"5C":{s1:7700,s3:6200},"6A":{s1:8800,s3:7500},"6B":{s1:9600,s3:8000},"6C":{s1:10600,s3:8900},"7A":{s1:11800,s3:9700},"7B":{s1:12800,s3:10800},"7C":{s1:14000,s3:12000}};
  var IHP_AF_S1 = ["1A","1B","1C","2A","2B","2C"];
  var IHP_AF_S3 = ["1A","1B","1C","2A","2B","2C","3A"];
  var MHC_G1_FEES = {"MSP1":50,"MSP2":75,"MSP3":150,"MSP4":200,"1A":300,"1B":450,"1C":500,"2A":725,"2B":1000,"2C":1300,"3A":1650,"3B":2300,"3C":2800,"4A":3000,"4B":3600,"4C":4000,"5A":4300,"5B":4980,"5C":5300,"6A":6800,"6B":7300,"6C":7500,"7A":8000,"7B":9500,"7C":9900};
  var ADEPT_TABLE_FEE = {"1A":500,"1B":700,"1C":850,"2A":1050,"2B":1350,"2C":1800,"3A":2200,"3B":2850,"3C":3500,"4A":4000,"4B":4650,"4C":5250,"5A":5750,"5B":6500,"5C":7000,"6A":8500,"6B":9200,"6C":10000,"7A":11000,"7B":12000,"7C":13500};

  var ADEPT_CONSULT = {"Consultation Fee (1st Visit)":{A:120,B:130,C:120},"Consultation Fee (Subsequent Visit)":{A:70,B:90,C:70},"Emergency Consultation (Before Midnight)":{A:180,B:180,C:null},"Emergency Consultation (From Midnight)":{A:250,B:250,C:null},"Repeat Medication":{A:5,B:5,C:null},"Daily Attendance Fee (In-Clinic Procedure)":{A:120,B:130,C:null},"Daily Hospital Attendance Fee (Procedure Admission)":{A:150,B:150,C:null},"Daily Hospital Attendance Fee (Medical Admission)":{A:200,B:200,C:null},"Daily ICU Hospital Attendance Fee":{A:300,B:300,C:null}};
  var CIGNA_CONSULT = {"Outpatient (1st Visit)":120,"Outpatient (Subsequent)":80,"Inpatient Attendance":210};
  var CIGNA_ORTHO = {"Aspirations of Joints":130,"Back-slab":230,"Dressing":40,"Intra-articular injection (Kenacort & Xylocaine)":150,"Application of full plasters (above elbow/knee)":380,"Application of full plasters (below elbow/knee)":260,"Removal of plaster cast":150};
  var FULLERTON_CONSULT = {"Initial Simple Consultation":70,"Initial Complex Consultation":100,"Subsequent Simple Consultation":45,"Subsequent Complex Consultation":70,"Normal Ward Rounds":150,"ICU / HD Ward Rounds":250,"AOH Normal Ward Rounds":200,"AOH ICU / HD Ward Rounds":300};
  var IHP_CONSULT = {"First Consultation (Long)":100,"First Consultation (Short)":75,"Follow-up Consultation":50,"Hospital Attendance":150};
  var MHC_G1_CONSULT = {"Specialist Regular Attendance":150,"Pediatrician & Medical Cases":150,"Midnight Attendance (12am\u20138am, wknd & PH)":250,"HD & ICU Visit for Anaesthetists":350};
  var MHC_G2_LIST = ["General Ward \u2014 Office Hours (per day)","HDU \u2014 Office Hours (per day)","ICU \u2014 Office Hours (per day)","General Ward \u2014 After-Hours Before Midnight (per visit)","HDU \u2014 After-Hours Before Midnight (per visit)","ICU \u2014 After-Hours Before Midnight (per visit)","General Ward \u2014 After-Hours After Midnight (per visit)","HDU \u2014 After-Hours After Midnight (per visit)","ICU \u2014 After-Hours After Midnight (per visit)","First Consult \u2014 Aviva MyShield","Repeat Consult \u2014 Aviva MyShield","First Consult \u2014 Aviva PCP Plan","Repeat Consult \u2014 Aviva PCP Plan"];
  var MHC_G2_RATE = {"General Ward \u2014 Office Hours (per day)":200,"HDU \u2014 Office Hours (per day)":250,"ICU \u2014 Office Hours (per day)":300,"General Ward \u2014 After-Hours Before Midnight (per visit)":200,"HDU \u2014 After-Hours Before Midnight (per visit)":250,"ICU \u2014 After-Hours Before Midnight (per visit)":300,"General Ward \u2014 After-Hours After Midnight (per visit)":300,"HDU \u2014 After-Hours After Midnight (per visit)":350,"ICU \u2014 After-Hours After Midnight (per visit)":450,"First Consult \u2014 Aviva MyShield":120,"Repeat Consult \u2014 Aviva MyShield":70,"First Consult \u2014 Aviva PCP Plan":120,"Repeat Consult \u2014 Aviva PCP Plan":80};
  var MHC_G1_KEY = "Group 1 \u2014 AIA / Income / Prudential / GE etc.";
  var MHC_G2_KEY = "Group 2 \u2014 Singlife";

  // ============ TOSP ROW FUNCTIONS ============
  function rowSelfPay(code){ var m=look(code); if(!code)return null;
    var ref=m?round2((m.pl+m.pu)/2):NF, table=m?m.t:DASH, pf=NUM(ref)?ref:NA, af;
    if(!NUM(pf))af=NA; else{var mid=((m.al||0)+(m.au||0))/2; af=mid===0?round2(pf*.25):round2(mid);}
    return {ref:ref,table:table,pf:pf,af:af,asst:NP,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)}; }

  function rowAIA(code){ var a=lookAia(code); if(!code)return null;
    if(!a) return {ref:NF,table:DASH,pf:NA,af:NA,asst:NP,total:0};
    var table=a.t, fee=a.f, pf=NUM(fee)?fee:(AIA_PF_CAPS[table]!=null?AIA_PF_CAPS[table]:NA);
    var af=NUM(pf)&&AIA_AF_PCT[table]!=null?round2(pf*AIA_AF_PCT[table]):NA;
    return {ref:NUM(fee)?fee:"",table:table,pf:pf,af:af,asst:NP,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)}; }

  function rowAllianz(code){ var m=look(code); if(!code)return null;
    var ref=m?round2((m.pl+m.pu)/2):"", pf=NUM(ref)?ref:"", af="";
    if(NUM(pf)){var mid=((m.al||0)+(m.au||0))/2; af=mid===0?round2(pf*.25):round2(mid);}
    return {ref:ref,table:DASH,pf:pf,af:af,asst:DASH,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)}; }

  function rowGE(code){ var m=look(code); if(!code)return null;
    var c=m?m.pl:"", table=m?m.t:DASH, pf=NUM(c)?c:(GE_HC_PF_CAPS[table]!=null?GE_HC_PF_CAPS[table]:NA), af;
    if(!NUM(pf))af=""; else if(NUM(c)){var v=m.al||0; af=v===0?Math.max(pf*.25,500):v;} else af=Math.max(pf*.25,500);
    var asst=NUM(pf)?round2(pf*.25):"";
    return {ref:NUM(c)?c:"",table:table,pf:pf,af:af,asst:asst,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)+(NUM(asst)?asst:0)}; }

  function rowNTUC(code){ var m=look(code); if(!code)return null;
    var mid=m?round2((m.pl+m.pu)/2):"", table=m?m.t:DASH, pf=NUM(mid)?mid:(NTUC_PANEL_PF_CAPS[table]!=null?NTUC_PANEL_PF_CAPS[table]:NA), af;
    if(!NUM(pf))af=""; else if(NUM(mid)){var a=((m.al||0)+(m.au||0))/2; af=a===0?pf*.25:a;} else af=pf*.25;
    var asst=NUM(pf)?(IN(table,NTUC_ASST)?round2(pf*.25):NAP):"";
    return {ref:NUM(mid)?mid:"",table:table,pf:pf,af:af,asst:asst,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)+(NUM(asst)?asst:0)}; }

  function rowSinglife(code,i){ var m=look(code); if(!code)return null;
    var pct=i===0?1:.7, table=m?m.t:DASH, ref;
    if(m){var hi=IN(m.t,HIGH); ref=hi?m.pl+.6*(m.pu-m.pl):m.pl+.2*(m.pu-m.pl);}
    else ref=SINGLIFE_FALLBACK_PF[table]!=null?SINGLIFE_FALLBACK_PF[table]:NA;
    var pf=NUM(ref)?round2(ref*pct):NA, af;
    if(!NUM(pf))af=NA; else{ var raw; if(m){var hi2=IN(m.t,HIGH); raw=hi2?(m.al+.6*(m.au-m.al)):(m.al+.2*(m.au-m.al));} else {var fb=SINGLIFE_FALLBACK_AF[table]||0; raw=fb===0?(SINGLIFE_FALLBACK_PF[table]||0)*.25:fb;} af=raw===0?round2((NUM(ref)?ref:0)*.25*pct):round2(raw*pct); }
    return {ref:NUM(ref)?round2(ref):NA,table:table,pf:pf,af:af,asst:NP,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)}; }

  function rowNpe(code,i,ctx){ var a=lookNpe(code); if(!code)return null;
    var cpx=(ctx.toggle||"Std")==="Cpx";
    if(!a) return {ref:"",table:ctx.toggle||"Std",tableIsToggle:true,pf:NA,af:NA,asst:cpx?NA:NAP,total:0};
    var ref=a.lb, pf=cpx?a.ub:a.lb;
    var af=NUM(pf)?round2(pf*.25):NA;
    var asst=cpx?(NUM(pf)?round2(pf*.25):NA):NAP;
    return {ref:ref,table:ctx.toggle||"Std",tableIsToggle:true,pf:pf,af:af,asst:asst,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)+(NUM(asst)?asst:0)}; }

  // --- Corporate ---
  function rowADEPT(code,i,ctx){ var m=look(code); if(!code)return null;
    var prog=ctx.step1?ctx.step1.ti:"Programme A";
    var table=m?m.t:"Not found";
    if(prog==="Programme C") return {ref:NAP,table:table,pf:NAP,af:NAP,asst:NAP,total:0};
    var fee = m ? (ADEPT_TABLE_FEE[table]!=null?ADEPT_TABLE_FEE[table]:"Table not found") : NF;
    var pf = NUM(fee)?fee:NA;
    var af = NUM(pf)?round2(pf*0.25):NAP;
    var asst = NUM(pf)?round2(pf*0.25):NAP;
    return {ref:fee,table:table,pf:pf,af:af,asst:asst,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)+(NUM(asst)?asst:0)}; }

  var ALLIANCE_MULT=[1,.5,.25,.25,.25];
  function rowAlliance(code,i){ var m=look(code); if(!code)return null;
    var pct=ALLIANCE_MULT[i]!=null?ALLIANCE_MULT[i]:.25, c=m?m.pl:"", table=m?m.t:DASH, pf;
    if(NUM(c))pf=round2(c*pct); else pf=ALLIANCE_FALLBACK_PF[table]!=null?round2(ALLIANCE_FALLBACK_PF[table]*pct):NA;
    var af; if(!NUM(pf))af=NA; else{var raw=m?(m.al||0):0; af=raw===0?Math.max(round2(pf*.25),200):round2(raw*pct);}
    return {ref:NUM(c)?c:"",table:table,pf:pf,af:af,asst:NP,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)}; }

  var CIGNA_SAME=[1,.5,.25,0], CIGNA_SEP=[1,.95,.9,0];
  function rowCigna(code,i,ctx){ var m=look(code); if(!code)return null;
    var tog=ctx.toggle||"Std \u2022 Same incision";
    var ref=m?round2((m.pl+m.pu)/2):"";
    var isStd=tog.indexOf("Std")===0, isSame=tog.indexOf("Same")!==-1;
    var mi=Math.min(i,3), mult=isSame?CIGNA_SAME[mi]:CIGNA_SEP[mi];
    var lb=m?m.pl:0, ub=m?m.pu:0, pf;
    var base=isStd?(lb+ub)*.45:ub*.95;
    pf = (lb===0||!m)?NA:round2(base*mult);
    var af; if(!NUM(pf))af=NA; else{ var baseAf=isStd?((m.al||0)+(m.au||0))*.5:NaN; af=NUM(baseAf)?round2(baseAf*mult):NA; }
    return {ref:ref,table:tog,tableIsToggle:true,pf:pf,af:af,asst:NP,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)}; }

  var FULL_MULT=[1,.5,.5,.5,.5];
  function rowFullerton(code,i){ var m=look(code); if(!code)return null;
    var pct=FULL_MULT[i], c=m?m.pl:NF, table=m?m.t:DASH, pf=NUM(c)?round2(c*pct):NA, af;
    if(!NUM(pf))af=NA; else{var lo=m?(m.al||0):0; af=lo===0?round2(pf*.25):round2(lo*pct);}
    return {ref:NUM(c)?c:NF,table:table,pf:pf,af:af,asst:NP,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)}; }

  var IHP_MULT=[1,.5,.5,.5,.5];
  function rowIhp(code,i,ctx){ var m=look(code); if(!code)return null;
    var sched=(ctx.selector&&ctx.selector.indexOf("Schedule 1")===0)?"s1":"s3";
    var table=m?m.t:DASH;
    var base; if(!m)base=NF; else base=IHP_SURGEON_FEES[table]?IHP_SURGEON_FEES[table][sched]:"Table not in IHP";
    var pct=IHP_MULT[i], pf=NUM(base)?round2(base*pct):NA;
    var af; if(!NUM(pf))af=NA; else{ var fixed=(sched==="s1"&&IN(table,IHP_AF_S1))||(sched==="s3"&&IN(table,IHP_AF_S3)); af=fixed?500:round2(pf*.25); }
    var asst=NUM(pf)?round2(pf*.20):NA;
    return {ref:NUM(base)?base:base,table:table,pf:pf,af:af,asst:asst,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)+(NUM(asst)?asst:0)}; }

  function ixMult(client,inc,i){
    var A=client.indexOf("Allianz")===0, Cg=client.indexOf("Cigna")===0;
    if(inc==="Same incision"){ if(A)return i===0?1:.8; if(Cg)return [1,.5,.25,.25,.25][Math.min(i,4)]; return i===0?1:.5; }
    if(inc==="Different incision"){ if(A)return 1; if(Cg)return [1,.95,.9,.9,.9][Math.min(i,4)]; return 1; }
    /* Combination */ if(A)return i===0?1:.8; if(Cg)return [1,.95,.9,.9,.9][Math.min(i,4)]; return i===0?1:.5;
  }
  function rowIx(code,i,ctx){ var m=look(code); if(!code)return null;
    var client=ctx.selector||"All Other Clients (Schedule 3)", inc=ctx.toggle||"Same incision";
    var pctBase=client.indexOf("Allianz")===0?.5:.4;
    var ref=m?round2(m.pl+pctBase*(m.pu-m.pl)):NF;
    var mult=ixMult(client,inc,i), pf=NUM(ref)?round2(ref*mult):NA;
    var af; if(!NUM(pf))af=NA; else{var mid=m?((m.al||0)+(m.au||0))/2:0; af=mid===0?round2(pf*.25):round2(mid);}
    return {ref:ref,table:inc,tableIsToggle:true,pf:pf,af:af,asst:NP,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)}; }

  var MHC_G2_MULT=[1,.5,.25,0,0];
  function rowMhc(code,i,ctx){ var m=look(code); if(!code)return null;
    var group=ctx.step1?ctx.step1.vt:MHC_G1_KEY, isG1=group.indexOf("Group 1")===0;
    var tog=ctx.toggle;
    if(isG1){
      var table=m?m.t:DASH, base=m?(MHC_G1_FEES[table]!=null?MHC_G1_FEES[table]:"Table not in MHC"):NF, pf;
      if(i===0){ pf=NUM(base)?base:NA; }
      else {
        if(!NUM(base)) pf=NA;
        else if(tog==="Different incision (50%)") pf=round2(base*.5);
        else if(tog==="Gastro+Colonoscopy (100%)") pf=base;
        else pf=NP;
      }
      var af=NUM(pf)?Math.max(round2(pf*.25),150):NA;
      return {ref:NUM(base)?base:base,table:i===0?table:(tog||"Same incision (not payable)"),tableIsToggle:i!==0,pf:pf,af:af,asst:NP,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)};
    } else {
      // Group 2 (Singlife) — from MHC Singlife schedule
      var a = code ? MSL[String(code).trim().toUpperCase()] : null;
      var mult = MHC_G2_MULT[i];
      if(mult===0) return {ref:NA,table:tog||MHC_G2_KEY,tableIsToggle:i!==0,pf:NP,af:NP,asst:NP,total:0};
      if(!a) return {ref:NF,table:i===0?DASH:(tog||"—"),tableIsToggle:i!==0,pf:NA,af:NA,asst:NA,total:0};
      var pf = round2(a.sf*mult);
      var af = (a.af==null||a.af===0) ? NA : round2(a.af*mult);
      var asst = round2(pf*0.20);
      return {ref:a.sf,table:i===0?DASH:(tog||"—"),tableIsToggle:i!==0,pf:pf,af:af,asst:asst,total:(NUM(pf)?pf:0)+(NUM(af)?af:0)+(NUM(asst)?asst:0)};
    }
  }

  // ============ STEP 1 COMPUTE ============
  function n(v){ var x=parseFloat(v); return isFinite(x)?x:0; }
  function vpd(v){ var x=parseFloat(v); return isFinite(x)?x:1; }
  var STEP1 = {
    "AIA": function(f,t,vp,d){ d=n(d); var v=vpd(vp);
      if(f==="Day Surgery")return 200*d;
      if(f==="General Ward")return (t==="Office Hours"?300:t==="After-office (Before Midnight)"?250:350)*d;
      if(f==="HDU")return (t==="Office Hours"?375:t==="After-office (Before Midnight)"?300:425)*v*d;
      if(f==="ICU")return (t==="Office Hours"?450:t==="After-office (Before Midnight)"?375:525)*v*d;
      return 0; },
    "Great Eastern": function(vt,ti,vp,d){ d=n(d); var v=vpd(vp);
      switch(vt){case"Outpatient (1st Visit)":return 150*d;case"Outpatient (Subsequent Visit)":return 100*d;case"Day Surgery":return 150*d;case"Emergency (Before Midnight)":return 400*d;case"Emergency (After Midnight)":return 600*d;case"General Ward":return (ti==="After Midnight"?320:210)*d;case"HDU":return (ti==="After Midnight"?370:260)*v*d;case"ICU":return (ti==="After Midnight"?480:320)*v*d;default:return 0;} },
    "NTUC": function(vt,ti,vp,d){ d=n(d); var v=vpd(vp);
      switch(vt){case"Outpatient (1st Visit)":return 200*d;case"Outpatient (Follow-up)":return 100*d;case"Emergency (A&E)":return (ti==="After Hours"?500:400)*d;case"Inpatient - General Ward":return (ti==="After Hours"?300:200)*v*d;case"Inpatient - HDU":return (ti==="After Hours"?350:250)*v*d;case"Inpatient - ICU":return (ti==="After Hours"?400:300)*v*d;default:return 0;} },
    "Singlife": function(vt,ti,vp,d){ d=n(d); var v=vpd(vp);
      switch(vt){case"Outpatient (1st Visit)":return 160*d;case"Outpatient (Follow-up)":return 100*d;case"General Ward":return (ti==="After Midnight"?320:210)*d;case"High Dependency Unit (HDU)":return (ti==="After Midnight"?370:260)*v*d;case"Intensive Care Unit (ICU)":return (ti==="After Midnight"?480:320)*v*d;case"A&E (Before Midnight)":return 400*d;case"A&E (After Midnight / 12am\u20136am)":return 600*d;default:return 0;} },
    "Alliance": function(vt,ti,vp,d){ d=n(d); if(vt==="Outpatient (1st Visit)")return 120*d; if(vt==="Outpatient (Follow-up)")return 70*d; return 0; },
    "NTUC (Extended Panel)": function(vt,ti,vp,d){ d=n(d); var v=vpd(vp), cpx=ti==="Complex (Upper Bound)";
      switch(vt){case"Outpatient (1st Visit)":return (cpx?350:150)*d;case"Outpatient (Follow-up)":return (cpx?285:85)*d;case"Emergency (A&E)":return (cpx?550:300)*d;case"Inpatient - General Ward":return (cpx?350:200)*v*d;case"Inpatient - HDU":return (cpx?450:250)*v*d;case"Inpatient - ICU":return (cpx?550:300)*v*d;default:return 0;} },
    "ADEPT": function(vt,pg,vp,d){ d=n(d); var r=ADEPT_CONSULT[vt]; if(!r)return 0; var rate=pg==="Programme A"?r.A:pg==="Programme B"?r.B:r.C; return (rate||0)*d; },
    "CIGNA": function(vt,ti,vp,d){ d=n(d); if(vt==="Outpatient / Inpatient")return (CIGNA_CONSULT[ti]||0)*d; return (CIGNA_ORTHO[ti]||0)*d; },
    "Fullerton": function(vt,ti,vp,d){ d=n(d); return (FULLERTON_CONSULT[vt]||0)*d; },
    "IHP": function(vt,ti,vp,d){ d=n(d); if(vt==="Hospital Attendance")return 150*vpd(vp)*d; return (IHP_CONSULT[vt]||0)*d; },
    "iXchange": function(vt,ti,vp,d){ d=n(d); if(vt==="Hospitalisation Attendance")return 150*vpd(vp)*d; if(vt==="A&E Attendance Fee"){var r=ti==="Office Hours"?250:ti==="After-Hours Evening"?350:ti==="After-Hours Midnight"?500:0; return r*d;} return 0; },
    "MHC": function(grp,vt,vp,d){ d=n(d);
      if(grp.indexOf("Group 1")===0){ if(vt==="Specialist Regular Attendance")return 150*d; if(vt==="Pediatrician & Medical Cases")return Math.min(150*d,300); if(vt.indexOf("Midnight Attendance")===0)return 250*d; if(vt.indexOf("HD & ICU")===0)return 350*d; return 0; }
      return (MHC_G2_RATE[vt]||0)*d; }
  };

  // ============ STEP 1 SPECS ============
  var GE_WARD=["General Ward","HDU","ICU"], GE_T=["Office Hours","Before Midnight","After Midnight"];
  var NTUC_AH=["Emergency (A&E)","Inpatient - General Ward","Inpatient - HDU","Inpatient - ICU"];
  var NTUC_MULTI=["Inpatient - General Ward","Inpatient - HDU","Inpatient - ICU"];
  var AIA_WARD=["General Ward","HDU","ICU"], AIA_T=["Office Hours","After-office (Before Midnight)","After-office (After Midnight)"];
  var L4={ vt:"Visit type", ti:"Visit timing", vp:"Visits per day", d:"Number of days / visits" };

  var STEP1SPEC = {
    "AIA": { note:"After-office hours: Mon\u2013Fri 1801\u20130759hr | Sat, Sun & PH: whole day | After midnight = 0001\u20130759hr", hasConsult:true, labels:{vt:"Facility type",ti:"Visit timing",vp:"Visits per day",d:"Number of days / visits"}, visitTypes:["Day Surgery","General Ward","HDU","ICU"], defaultVt:"Day Surgery", timing:function(vt){return IN(vt,AIA_WARD)?AIA_T:null;}, vpd:function(vt){return (vt==="HDU"||vt==="ICU")?["1","2"]:null;} },
    "Allianz": { note:"Allianz does not use a fixed consultation fee schedule \u2014 leave blank.", warn:true, hasConsult:false, labels:{vt:"Facility type",ti:"Visit timing",vp:"Visits per day",d:"Number of days / visits"} },
    "Great Eastern": { note:"Office hours = daytime | Before Midnight = after-hours up to 2359 | After Midnight = 0000\u20130600hr | HDU/ICU: max 2 visits/day", hasConsult:true, labels:L4, visitTypes:["Outpatient (1st Visit)","Outpatient (Subsequent Visit)","Day Surgery","Emergency (Before Midnight)","Emergency (After Midnight)","General Ward","HDU","ICU"], defaultVt:"Day Surgery", timing:function(vt){return IN(vt,GE_WARD)?GE_T:null;}, vpd:function(vt){return (vt==="HDU"||vt==="ICU")?["1","2"]:null;} },
    "NTUC": { note:"Panel rates (Dr Ben & Dr Yong Ren). After hours applies to Emergency, Ward, HDU & ICU. | Ward types: up to 2 visits/day.", hasConsult:true, labels:L4, visitTypes:["Outpatient (1st Visit)","Outpatient (Follow-up)","Emergency (A&E)","Inpatient - General Ward","Inpatient - HDU","Inpatient - ICU"], defaultVt:"Inpatient - General Ward", timing:function(vt){return IN(vt,NTUC_AH)?["Office Hours","After Hours"]:null;}, vpd:function(vt){return IN(vt,NTUC_MULTI)?["1","2"]:null;} },
    "NTUC (Extended Panel)": { note:"Extended panel rates (e.g. Dr Chen). 'Standard' uses the lower-bound fee; 'Complex' uses the upper bound. Ward types allow up to 2 visits/day. No after-hours differential for outpatient.", hasConsult:true, labels:{vt:"Visit type",ti:"Case complexity",vp:"Visits per day",d:"Number of days / visits"}, visitTypes:["Outpatient (1st Visit)","Outpatient (Follow-up)","Emergency (A&E)","Inpatient - General Ward","Inpatient - HDU","Inpatient - ICU"], defaultVt:"Inpatient - General Ward", timing:function(){return ["Standard (Lower Bound)","Complex (Upper Bound)"];}, vpd:function(vt){return IN(vt,NTUC_MULTI)?["1","2"]:null;} },
    "Singlife": { note:"Outpatient: S$160 first / S$100 follow-up. Before Midnight = after-office to 2359. After Midnight = 0000\u20130600. GW 1 visit/day; HDU & ICU up to 2/day.", hasConsult:true, labels:L4, visitTypes:["Outpatient (1st Visit)","Outpatient (Follow-up)","General Ward","High Dependency Unit (HDU)","Intensive Care Unit (ICU)","A&E (Before Midnight)","A&E (After Midnight / 12am\u20136am)"], defaultVt:"General Ward", timing:function(vt){ if(vt.indexOf("A&E")===0||vt==="Outpatient (1st Visit)"||vt==="Outpatient (Follow-up)")return null; return ["Office Hours","Before Midnight","After Midnight"]; }, vpd:function(vt){return (vt==="High Dependency Unit (HDU)"||vt==="Intensive Care Unit (ICU)")?["1","2"]:null;} },
    "ADEPT": { note:"Programme A: Great Eastern, INCOME, DA Adept Health | Programme B: AXA, NOWHEALTH | Programme C: DA Pay (consultation only, no PF/AF)", hasConsult:true, labels:{vt:"Visit type",ti:"Programme",vp:"Visits per day",d:"Number of days / visits"}, visitTypes:Object.keys(ADEPT_CONSULT), defaultVt:"Daily Hospital Attendance Fee (Medical Admission)", timing:function(){return ["Programme A","Programme B","Programme C"];}, vpd:function(){return null;} },
    "Alliance": { note:"Alliance Medinet outpatient consultation (before GST, Jan 2026). First S$120 | Follow-up S$70. No separate inpatient attendance fee.", hasConsult:true, labels:L4, visitTypes:["Outpatient (1st Visit)","Outpatient (Follow-up)"], defaultVt:"Outpatient (1st Visit)", timing:function(){return null;}, vpd:function(){return null;} },
    "CIGNA": { note:"NSC procedures only (Dec 2023). Clinic hours Mon\u2013Fri 0900\u20131700, Sat 0900\u20131300. Orthopaedic procedure fees include consumables.", hasConsult:true, labels:{vt:"Fee category",ti:"Visit / procedure type",vp:"Visits per day",d:"Number of days / visits"}, visitTypes:["Outpatient / Inpatient","Orthopaedic In-Clinic Procedure"], defaultVt:"Outpatient / Inpatient", timing:function(vt){return vt==="Outpatient / Inpatient"?Object.keys(CIGNA_CONSULT):Object.keys(CIGNA_ORTHO);}, vpd:function(){return null;} },
    "Fullerton": { note:"AOH (After Office Hours) = 12 midnight to 8am, weekends & PH. Timing/visits-per-day are built into each rate row.", hasConsult:true, labels:{vt:"Visit / round type",ti:"Visit timing",vp:"Visits per day",d:"Number of days / visits"}, visitTypes:Object.keys(FULLERTON_CONSULT), defaultVt:"Normal Ward Rounds", timing:function(){return null;}, vpd:function(){return null;} },
    "IHP": { note:"First Visit (Long) \u2265 20 min; (Short) < 20 min. Hospital Attendance S$150/visit, max 2/day. Step 2: Schedule 1 = Safe Meridian; Schedule 3 = all other insurers.", hasConsult:true, labels:{vt:"Visit / fee type",ti:"Visit timing",vp:"Visits per day",d:"Number of days / visits"}, visitTypes:Object.keys(IHP_CONSULT), defaultVt:"Hospital Attendance", timing:function(){return null;}, vpd:function(vt){return vt==="Hospital Attendance"?["1","2"]:null;} },
    "iXchange": { note:"A&E Office Hours: Mon\u2013Fri 0900\u20131800, Sat 0900\u20131300. Evening: Mon\u2013Fri 1801\u20132359, Sat 1301\u20132359, Sun 0900\u20132359. Midnight: 0000\u20130859.", hasConsult:true, labels:{vt:"Visit / fee type",ti:"A&E timing",vp:"Visits per day",d:"Number of days / visits"}, visitTypes:["Hospitalisation Attendance","A&E Attendance Fee"], defaultVt:"Hospitalisation Attendance", timing:function(vt){return vt==="A&E Attendance Fee"?["Office Hours","After-Hours Evening","After-Hours Midnight"]:null;}, vpd:function(vt){return vt==="Hospitalisation Attendance"?["1","2","3"]:null;} },
    "MHC": { note:"Select insurer group first. Group 1 (AIA/Income/Prudential/GE): Specialist S$150/day; Midnight S$250/day; HD & ICU S$350/day. Group 2 (Singlife): office-hours daily fee; after-hours per-visit.", hasConsult:true, labels:{vt:"Insurer group",ti:"Visit / fee type",vp:"Visits per day",d:"Number of days / visits"}, visitTypes:[MHC_G1_KEY,MHC_G2_KEY], defaultVt:MHC_G1_KEY, timing:function(vt){return vt.indexOf("Group 1")===0?Object.keys(MHC_G1_CONSULT):MHC_G2_LIST;}, vpd:function(){return null;} }
  };

  // ============ TOSP SPECS ============
  var IHP_SEL={ label:"IHP Schedule", options:["Schedule 1 \u2014 Safe Meridian","Schedule 3 \u2014 All Other Insurers"], def:"Schedule 1 \u2014 Safe Meridian" };
  var IX_SEL={ label:"Corporate client", options:["Allianz (Schedule 1)","Cigna (Schedule 2)","All Other Clients (Schedule 3)"], def:"All Other Clients (Schedule 3)" };
  var CIGNA_TOG=["Std \u2022 Same incision","Std \u2022 Separate incision","Cpx \u2022 Same incision","Cpx \u2022 Separate incision"];
  var IX_TOG=["Same incision","Different incision","Combination (A+B)"];
  var MHC_TOG=["Same incision (not payable)","Different incision (50%)","Gastro+Colonoscopy (100%)"];
  var H=function(a){return a;};
  var TOSP = {
    "SelfPay": { headers:["TOSP Code","MOH PF Midpoint","TOSP Table","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowSelfPay },
    "AIA": { headers:["TOSP Code","Panel Fee (ex-GST)","Table","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowAIA },
    "Allianz": { headers:["TOSP Code","MOH PF Midpoint","\u2013","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowAllianz },
    "Great Eastern": { headers:["TOSP Code","MOH PF Lower","TOSP Table","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowGE },
    "NTUC": { headers:["TOSP Code","MOH PF Midpoint","TOSP Table","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowNTUC },
    "Singlife": { headers:["TOSP Code","PF (Percentile)","TOSP Table","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowSinglife },
    "NTUC (Extended Panel)": { headers:["TOSP Code","Lower Bound","Std / Cpx","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowNpe, toggle:function(){return ["Std","Cpx"];}, toggleDef:function(){return "Std";} },
    "ADEPT": { headers:["TOSP Code","ADEPT Table Fee","TOSP Table","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowADEPT },
    "Alliance": { headers:["TOSP Code","MOH PF Lower","TOSP Table","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowAlliance },
    "CIGNA": { headers:["TOSP Code","MOH PF Reference","Std/Cpx \u2022 Incision","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowCigna, toggle:function(){return CIGNA_TOG;}, toggleDef:function(){return CIGNA_TOG[0];} },
    "Fullerton": { headers:["TOSP Code","MOH PF Lower","TOSP Table","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowFullerton },
    "IHP": { headers:["TOSP Code","IHP Surgeon Fee","TOSP Table","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowIhp, sel:IHP_SEL },
    "iXchange": { headers:["TOSP Code","MOH PF Reference","Incision Type","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowIx, sel:IX_SEL, toggle:function(){return IX_TOG;}, toggleDef:function(){return IX_TOG[0];} },
    "MHC": { headers:["TOSP Code","PF Reference","Table / Toggle","Surgeon Fee (PF)","AF Fee","Asst. Surgeon Fee","Row Total"], row:rowMhc, toggle:function(i){return i===0?null:MHC_TOG;}, toggleDef:function(){return MHC_TOG[0];} }
  };

  var DATA_NOTE = {};

  // ============ FOOTNOTES ============
  var FOOTNOTES = {
    "SelfPay":[{title:"Surgeon fee (PF) basis",body:"Midpoint of the MOH Benchmark Fee range: (lower + upper) \u00F7 2. Effective 01/01/2025. Unknown codes show 'TOSP not found'.",tag:"(LB+UB)\u00F72"},{title:"Anaesthetist fee (AF) basis",body:"Midpoint of the MOH AF benchmark. Where S$0, AF defaults to 25% of the surgeon fee.",tag:"25% fallback"},{title:"Assistant surgeon fee",body:"No separate assistant surgeon fee in self-pay. All rows show Not Payable.",tag:"Not Payable"},{title:"GST",body:"Fees are ex-GST. GST at the prevailing rate is added on top for self-pay patients.",tag:"Add GST"}],
    "AIA":[{title:"Surgeon fee (PF) basis",body:"Panel fee (ex-GST) from the AIA Personal TOSP schedule. Where a code has no panel fee, the AIA PF cap by table code (1A\u20137C) applies.",tag:"AIA Panel Fee"},{title:"Anaesthetist fee (AF) basis",body:"AF = surgeon fee \u00D7 table percentage: 30% (tables 1\u20132), 25% (tables 3\u20135), 20% (tables 6\u20137).",tag:"30/25/20%"},{title:"Assistant surgeon fee",body:"No separate assistant surgeon fee \u2014 per MOH guidance the surgeon fee covers assistant doctors. All rows show Not Payable.",tag:"Not Payable"}],
    "Allianz":[{title:"Surgeon fee basis",body:"MOH Benchmark Fee midpoint for the TOSP code, effective 01/01/2025.",tag:"MOH Midpoint"},{title:"Anaesthetist fee basis",body:"Midpoint of the MOH AF benchmark. Where S$0, AF defaults to 25% of the surgeon fee.",tag:"25% fallback"},{title:"Consultation fee",body:"Allianz applies no fixed consultation fee schedule. Leave the consultation section blank.",tag:"Not applicable"}],
    "Great Eastern":[{title:"Surgeon fee (PF) basis",body:"MOH Benchmark Fee lower range. Codes not in MOH use the GE Health Connect schedule cap.",tag:"MOH Lower"},{title:"Anaesthetist fee (AF) basis",body:"MOH AF lower range. Where zero or code absent, AF = MAX(PF \u00D7 25%, S$500).",tag:"min S$500"},{title:"Assistant surgeon fee",body:"25% of the surgeon fee, for every TOSP row, included in totals.",tag:"PF \u00D7 25%"},{title:"HDU / ICU visits",body:"Up to 2 attendance visits per day. Select actual visits/day.",tag:"Max 2/day"}],
    "NTUC":[{title:"Surgeon fee (PF) basis",body:"MOH Benchmark Fee midpoint. Codes not in MOH use the NTUC Income panel schedule (MSP\u20137C).",tag:"MOH Midpoint"},{title:"Anaesthetist fee (AF) basis",body:"Midpoint of the MOH AF benchmark. Where zero or absent, AF = 25% of PF.",tag:"25% fallback"},{title:"Assistant surgeon fee",body:"25% of PF, payable only for table codes 4A and above. MSP\u20133C show Not Applicable.",tag:"4A+ only"}],
    "Singlife":[{title:"Surgeon fee (PF) basis",body:"35th percentile of MOH range for tables 1A\u20135C (LB + 20%\u00D7(UB\u2212LB)); 55th percentile for 6A\u20137C.",tag:"35th/55th pct"},{title:"70% rule (items 2\u20135)",body:"1st item at 100%; items 2\u20135 at 70%. Applies to PF and AF.",tag:"70% from 2nd"},{title:"Anaesthetist fee (AF)",body:"Same percentile tiers on MOH AF. If S$0, defaults to 25% of surgeon fee. 70% multiplier applies.",tag:"35th/55th pct"},{title:"Assistant surgeon fee",body:"No separate assistant surgeon fee. All rows show Not Payable.",tag:"Not Payable"}],
    "NTUC (Extended Panel)":[{title:"Surgeon fee (PF) basis",body:"From the NTUC Income extended panel TOSP schedule. Per-row toggle: 'Std' applies the lower bound; 'Cpx' applies the upper bound for complex cases.",tag:"Own TOSP sheet"},{title:"Anaesthetist fee (AF)",body:"25% of the surgeon fee for every row. No separate MOH AF benchmark applied.",tag:"PF \u00D7 25%"},{title:"Assistant surgeon fee",body:"25% of PF, payable only when the row toggle is 'Cpx'. Standard rows show Not Applicable.",tag:"Cpx rows only"},{title:"Consultation fee",body:"'Standard (Lower Bound)' vs 'Complex (Upper Bound)' selects the income tier. Ward types allow up to 2 visits/day; no after-hours differential.",tag:"Extended panel"}],
    "ADEPT":[{title:"Programme A / B",body:"PF from the ADEPT Corporate table-code schedule (via the MOH table code). AF and assistant fee each 25% of PF.",tag:"25% AF/Asst"},{title:"Programme C \u2014 DA Pay",body:"Consultation rows only (S$120 first / S$70 subsequent). PF/AF/Asst not applicable.",tag:"No PF/AF"},{title:"Assistant surgeon fee",body:"25% of the surgeon fee for every payable row, included in the Row Total and Grand Total.",tag:"PF \u00D7 25%"}],
    "Alliance":[{title:"Surgeon fee (PF) basis",body:"MOH lower range \u00D7 row multiplier. Codes not in MOH use the Alliance Medinet fallback schedule.",tag:"MOH Lower \u00D7 %"},{title:"Multiple operations",body:"Main 100%, 2nd 50%, 3rd\u20135th 25% \u2014 same incision. Applies to PF and AF.",tag:"100/50/25%"},{title:"Anaesthetist fee (AF)",body:"MOH AF lower \u00D7 multiplier. Where zero, AF = MAX(PF \u00D7 25%, S$200).",tag:"min S$200"},{title:"Consultation fee",body:"Alliance Medinet outpatient: first S$120, follow-up S$70 (before GST).",tag:"S$120 / S$70"}],
    "CIGNA":[{title:"PF \u2014 Standard",body:"(MOH lower + upper) \u00D7 0.45 for standard-complexity procedures.",tag:"(LB+UB)\u00D70.45"},{title:"PF \u2014 Complex",body:"MOH upper range \u00D7 0.95 for rows toggled to 'Cpx'.",tag:"UB\u00D70.95"},{title:"Anaesthetist fee (AF)",body:"Standard AF = (MOH AF lower + upper) \u00D7 0.5 \u00D7 row multiplier. Complex rows show N/A for AF.",tag:"(LB+UB)\u00D70.5"},{title:"Same incision",body:"1st 100%, 2nd 50%, 3rd 25%, 4th+ 0%.",tag:"100/50/25/0"},{title:"Separate incision",body:"1st 100%, 2nd 95%, 3rd 90%, 4th+ 0%.",tag:"100/95/90/0"},{title:"Assistant surgeon fee",body:"Included in surgeon fee \u2014 not separately payable.",tag:"Not Payable"}],
    "Fullerton":[{title:"Surgeon fee (PF) basis",body:"MOH lower range. 1st item 100%; items 2\u20135 at 50%.",tag:"MOH Lower"},{title:"Multiple operations",body:"1st 100%, 2nd+ 50% each. Same multiplier applies to AF.",tag:"100/50%"},{title:"Anaesthetist fee (AF)",body:"MOH AF lower \u00D7 multiplier. Where S$0, AF = 25% of PF.",tag:"MOH Lower"},{title:"Assistant surgeon fee",body:"Included in surgeon fee \u2014 not separately payable.",tag:"Not Payable"},{title:"Consultation / ward rounds",body:"Initial simple S$70 / complex S$100; subsequent S$45 / S$70. Ward rounds S$150 (normal), S$250 (ICU/HD); AOH S$200 / S$300.",tag:"Feb 2025"}],
    "IHP":[{title:"Surgeon fee (PF) basis",body:"IHP surgical schedule by table code. Schedule 1 = Safe Meridian; Schedule 3 = all other insurers. Select the schedule above the table.",tag:"IHP Schedule"},{title:"Multiple operations",body:"1st 100%, 2nd\u20135th 50% each. Applies to PF, AF and assistant fee.",tag:"100/50%"},{title:"Anaesthetist fee (AF)",body:"Fixed S$500 for Schedule 1 tables 1A\u20132C and Schedule 3 tables 1A\u20133A; otherwise 25% of PF.",tag:"S$500 / 25%"},{title:"Assistant surgeon fee",body:"20% of surgeon fee (PF) for every row.",tag:"PF \u00D7 20%"},{title:"Consultation / attendance",body:"First (Long) S$100, (Short) S$75, Follow-up S$50. Hospital attendance S$150/visit, max 2/day.",tag:"Per IHP"}],
    "iXchange":[{title:"Surgeon fee (PF) basis",body:"Allianz = 50th percentile; Cigna & all others = 40th percentile of the MOH range. Select the corporate client above the table.",tag:"3 schedules"},{title:"Same incision",body:"Allianz 100%/80%; Cigna 100/50/25/25; Others 100%/50%.",tag:"Same"},{title:"Different incisions",body:"Allianz 100%; Cigna 100/95/90; Others 100%.",tag:"Different"},{title:"Combination (A+B)",body:"Allianz 100%/80%; Cigna 100/95/90; Others 100%/50%.",tag:"Combination"},{title:"Anaesthetist fee (AF)",body:"Midpoint of MOH AF benchmark; where S$0, 25% of PF. Not subject to the row multiplier.",tag:"(F+G)\u00F72"},{title:"Assistant surgeon fee",body:"Included in surgeon fee \u2014 not separately payable.",tag:"Not Payable"}],
    "MHC":[{title:"Insurer groups",body:"Group 1 = AIA/Income/Prudential/GE etc. (MHC surgical table). Group 2 = Singlife (MHC Singlife sheet). Select the group in Step 1.",tag:"2 groups"},{title:"Group 1 \u2014 PF",body:"MHC surgical table by table code. 1st op 100%; same incision = only 1st payable; different incision = 50%.",tag:"MHC table"},{title:"Group 1 \u2014 Gastro+Colonoscopy",body:"When performed in the same setting, both at 100%. Set the row toggle to 'Gastro+Colonoscopy (100%)'.",tag:"Both 100%"},{title:"Group 1 \u2014 AF",body:"25% of PF, minimum S$150.",tag:"25% min S$150"},{title:"Group 2 \u2014 fees",body:"Surgeon & AF from the MHC Singlife schedule. 1st 100%, 2nd 50%, 3rd 25%, 4th+ 0%. Assistant fee 20% of PF (rows 1\u20133).",tag:"Singlife schedule"}]
  };

  var PENDING_TOSP = "Awaiting the insurer's own TOSP fee sheet \u2014 upload it as CSV to enable this insurer.";

  // ============ REFERENCE FEE SCHEDULES ============
  function fmt(v){ return (typeof v==="number"&&isFinite(v)) ? "S$"+v.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}) : (v==null?"":String(v)); }
  var REFS = [
    { key:"MOH", label:"MOH Benchmark Fees", sub:"Effective 01/01/2025 \u00B7 Surgeon (PF) & Anaesthetist (AF) lower\u2013upper ranges",
      data:function(){return MOH;},
      columns:[{h:"TOSP Code",a:"left",m:true},{h:"Description",a:"left"},{h:"Table",a:"center"},{h:"PF Lower",a:"right",m:true},{h:"PF Upper",a:"right",m:true},{h:"AF Lower",a:"right",m:true},{h:"AF Upper",a:"right",m:true}],
      cells:function(c,r){return [c, r.d||"", r.t||"\u2014", fmt(r.pl), fmt(r.pu), r.al?fmt(r.al):"\u2014", r.au?fmt(r.au):"\u2014"];},
      search:function(c,r){return c+" "+(r.d||"")+" "+(r.t||"");} },
    { key:"AIA", label:"AIA Personal (TOSP)", sub:"Panel fees excl. GST \u00B7 by TOSP code",
      data:function(){return AIA;},
      columns:[{h:"TOSP Code",a:"left",m:true},{h:"Table",a:"center"},{h:"Panel Fee (ex-GST)",a:"right",m:true}],
      cells:function(c,r){return [c, r.t||"\u2014", fmt(r.f)];},
      search:function(c,r){return c+" "+(r.t||"");} },
    { key:"NTUCEXT", label:"NTUC Extended (TOSP)", sub:"Income lower & upper bounds \u00B7 by TOSP code",
      data:function(){return NPE;},
      columns:[{h:"TOSP Code",a:"left",m:true},{h:"Table",a:"center"},{h:"Income Lower",a:"right",m:true},{h:"Income Upper",a:"right",m:true}],
      cells:function(c,r){return [c, r.t||"\u2014", fmt(r.lb), fmt(r.ub)];},
      search:function(c,r){return c+" "+(r.t||"");} },
    { key:"MHCSL", label:"MHC (Corporate) Singlife", sub:"Surgeon & anaesthetist fee schedule \u00B7 by TOSP code",
      data:function(){return MSL;},
      columns:[{h:"TOSP Code",a:"left",m:true},{h:"Surgeon Fee",a:"right",m:true},{h:"Anaesthetist Fee",a:"right",m:true}],
      cells:function(c,r){return [c, fmt(r.sf), fmt(r.af)];},
      search:function(c,r){return c;} },
    { key:"ADEPT", label:"ADEPT Corporate (Table Code)", sub:"Standard guide fee by surgical table",
      data:function(){var o={}; Object.keys(ADEPT_TABLE_FEE).forEach(function(t){o[t]={fee:ADEPT_TABLE_FEE[t]};}); return o;},
      ordered:function(){return Object.keys(ADEPT_TABLE_FEE);},
      columns:[{h:"Surgical Table",a:"left"},{h:"Standard Guide Fee",a:"right",m:true}],
      cells:function(t,r){return ["Table "+t, fmt(r.fee)];},
      search:function(t,r){return t;} }
  ];
  function refByKey(k){ for(var i=0;i<REFS.length;i++) if(REFS[i].key===k) return REFS[i]; return REFS[0]; }
  function refQuery(key, q){
    var ref=refByKey(key), data=ref.data();
    var keys = ref.ordered ? ref.ordered() : Object.keys(data).sort();
    var total=keys.length; q=(q||"").trim().toUpperCase();
    var matched=[];
    for(var i=0;i<keys.length;i++){ var c=keys[i]; if(q){ if(ref.search(c,data[c]).toUpperCase().indexOf(q)===-1) continue; } matched.push(c); }
    var count=matched.length, cap=matched.slice(0,400);
    var rows=cap.map(function(c,ri){ return { cells:ref.cells(c,data[c]), i:ri }; });
    return { label:ref.label, sub:ref.sub, columns:ref.columns, rows:rows, total:total, count:count, shown:cap.length, capped:count>400 };
  }

  var PERSONAL = {
    "AIA":{status:"ready",rateDate:"May 2025"},
    "Allianz":{status:"ready",rateDate:"2025"},
    "Great Eastern":{status:"ready",rateDate:"Jan 2025"},
    "NTUC":{status:"ready",rateDate:"Jul 2023"},
    "NTUC (Extended Panel)":{status:"ready",rateDate:"Jul 2023"},
    "Singlife":{status:"ready",rateDate:"Jan 2025"}
  };
  var CORPORATE = {
    "ADEPT":{status:"ready",rateDate:"2025"},
    "Alliance":{status:"ready",rateDate:"Jan 2026"},
    "CIGNA":{status:"ready",rateDate:"Dec 2023"},
    "Fullerton":{status:"ready",rateDate:"Feb 2025"},
    "IHP":{status:"ready",rateDate:"2025"},
    "iXchange":{status:"ready",rateDate:"2025"},
    "MHC":{status:"ready",rateDate:"Jul 2022"}
  };

  window.CALC = {
    hasCode:function(c){return !!look(c);}, lookup:look,
    PERSONAL:PERSONAL, CORPORATE:CORPORATE,
    PERSONAL_ORDER:["AIA","Allianz","Great Eastern","NTUC","NTUC (Extended Panel)","Singlife"],
    CORP_ORDER:["ADEPT","Alliance","CIGNA","Fullerton","IHP","iXchange","MHC"],
    step1spec:function(k){return STEP1SPEC[k]||null;},
    step1calc:function(k,vt,ti,vp,d){return STEP1[k]?round2(STEP1[k](vt,ti,vp,d)):null;},
    tosp:function(k){return TOSP[k]||null;},
    footnotes:function(k){return FOOTNOTES[k]||[];},
    dataNote:function(k){return DATA_NOTE[k]||"";},
    refList:function(){return REFS.map(function(r){return {key:r.key,label:r.label};});},
    refQuery:refQuery,
    round2:round2, NUM:NUM
  };
})();
