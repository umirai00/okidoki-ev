/* GitHub Pages: cached aggregate means only. Parity tested against model.py. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.OkidokiStatic=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const finite=v=>typeof v==='number'&&Number.isFinite(v);
  function validate(m){
    if(!m||m.schema!=='okidoki-calibrated-v1')throw Error('モデル形式が不正です');
    for(const key of ['C_grid','g_grid']){
      const a=m[key];
      if(!Array.isArray(a)||!a.length||a.some((v,i)=>!Number.isSafeInteger(v)||(i>0&&v<=a[i-1])))throw Error('グリッドが不正です');
    }
    const cal=m.calibration;
    if(!cal||cal.target_percent!==96||['published_percent','independent_percent'].some(k=>!finite(cal[k])||Math.abs(cal[k]-96)>.100000001))throw Error('補正モデルの検算を確認できません');
    if(!Array.isArray(m.cells)||m.cells.length!==m.C_grid.length*m.g_grid.length)throw Error('事前計算表が欠けています');
    const seen=new Set();
    for(const r of m.cells){
      const id=`${r.C}:${r.g}`;
      if(!m.C_grid.includes(r.C)||!m.g_grid.includes(r.g)||seen.has(id)||typeof r.supported!=='boolean')throw Error('計算表の状態が不正です');
      seen.add(id);
      for(const k of ['I','R','normal_G','bonus_G','source_origins','source_stores','mc_paths','mc_se_medals'])if(!finite(r[k])||r[k]<0)throw Error('計算値が不正です');
      if(r.normal_G+r.bonus_G<=0||r.mc_paths<1)throw Error('計算値が不正です');
      if(r.C===0&&r.g===32){
        const pct=100*(1+(r.R-r.I)/(3*(r.normal_G+r.bonus_G)));
        if(Math.abs(pct-96)>.100000001||Math.abs(pct-cal.published_percent)>1e-6)throw Error('基準点が検算値と一致しません');
      }
    }
    return m;
  }
  function brackets(axis,x){
    const i=axis.indexOf(x);if(i>=0)return [[x,1]];
    const right=axis.findIndex(v=>v>x);if(right<=0)return [];
    const a=axis[right-1],b=axis[right];return [[a,(b-x)/(b-a)],[b,(x-a)/(b-a)]];
  }
  function estimate(m,C,g,L,E){
    if(![C,g,L,E].every(finite)||!Number.isSafeInteger(C)||C<0||g<0||L<=0||E<L)throw Error('入力値が不正です');
    const base={C,g,H:C+g,status:'out_of_range'};
    const cs=brackets(m.C_grid,C),gs=brackets(m.g_grid,g);
    if(!cs.length||!gs.length)return base;
    if(C>0&&cs.some(([c])=>c===0))return {...base,status:'insufficient'};
    const parts=[];
    for(const [c,wc] of cs)for(const [h,wg] of gs)parts.push([m.cells.find(r=>r.C===c&&r.g===h),wc*wg]);
    if(parts.some(([r])=>!r.supported))return {...base,status:'insufficient'};
    const values={};
    for(const k of ['I','R','normal_G','bonus_G','mc_se_medals'])values[k]=parts.reduce((s,[r,w])=>s+r[k]*w,0);
    const profit=values.R-values.I,games=values.normal_G+values.bonus_G;
    return {...base,status:'ok',...values,profit_medals:profit,yen:values.R*1000/E-values.I*1000/L,
      machine_return_pct:100*(1+profit/(3*games)),duration_minutes:games/750*60,
      source_origins:Math.min(...parts.map(([r])=>r.source_origins)),
      source_stores:Math.min(...parts.map(([r])=>r.source_stores)),interpolated:parts.length>1};
  }
  function predictTable(m,C,L,E){return m.g_grid.map(g=>estimate(m,C,g,L,E))}
  return {validate,estimate,predictTable};
});
