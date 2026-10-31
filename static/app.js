(function(){
  'use strict';
  const h=window.OkidokiHistory;
  const $=id=>document.getElementById(id);
  const form=$('form'),rows=$('rows'),details=$('details'),status=$('state');
  const C=$('C'),lend=$('lend'),exchange=$('exchange'),restore=$('history-restore');
  let history=h.initialState(),manualTouched=false,requestId=0;
  const modelUrl=document.documentElement.dataset.modelUrl;
  const staticModel=modelUrl?fetch(modelUrl).then(response=>{
    if(!response.ok)throw Error('事前計算データを読み込めません');
    return response.json();
  }).then(m=>window.OkidokiStatic.validate(m)):null;
  const num=(x,d=1)=>x.toLocaleString('ja-JP',{minimumFractionDigits:d,maximumFractionDigits:d});
  const cell=(tr,text,cls='')=>{const td=document.createElement('td');td.textContent=text;td.className=cls;tr.appendChild(td)};
  function restoreVisibility(){restore.hidden=!manualTouched||!h.needsRestore(history,C.value)}
  function historyView(){
    $('history-C').textContent=num(history.C,0);
    $('history-undo').disabled=$('history-clear').disabled=history.entries.length===0;
    $('history-rows').replaceChildren();
    history.entries.forEach((entry,i)=>{
      const view=h.rowView(history,i);
      const tr=document.createElement('tr');
      cell(tr,view.ordinal);cell(tr,num(view.games,0));cell(tr,view.kind,view.kindClass);cell(tr,view.range);
      $('history-rows').appendChild(tr);
    });
  }
  function applyHistory(){
    C.value=String(history.C);manualTouched=false;restoreVisibility();historyView();render();
  }
  function exchangeMinimum(clamp){
    const L=Number(lend.value);
    exchange.min=Number.isFinite(L)&&L>0?String(L):'0.001';
    if(clamp && Number.isFinite(L)&&L>0)exchange.value=String(h.exchangeFloor(exchange.value,L));
  }
  async function render(event){
    if(event)event.preventDefault();
    const id=++requestId;
    if(!form.checkValidity()){
      status.textContent='入力値を確認してください（C：0〜2,068、交換枚数≧貸出枚数）。';
      rows.replaceChildren();details.replaceChildren();return;
    }
    status.textContent='保存済み表を読み込み中…';
    try{
      let result;
      if(staticModel){
        const model=await staticModel;
        result={rows:window.OkidokiStatic.predictTable(model,Number(C.value),Number(lend.value),Number(exchange.value))};
      }else{
        const params=new URLSearchParams(new FormData(form));
        params.set('C',String(Number(C.value)));
        const response=await fetch('/api/estimate?'+params);
        if(id!==requestId)return;
        if(!response.ok)throw Error('入力またはモデルを確認してください');
        result=await response.json();
      }
      if(id!==requestId)return;
      rows.replaceChildren();details.replaceChildren();let ok=0;
      for(const r of result.rows){
        let tr=document.createElement('tr');cell(tr,num(r.g,0));
        if(r.status!=='ok'){
          cell(tr,'データ不足 / 範囲外','muted');cell(tr,'—');cell(tr,'—');cell(tr,'—');rows.appendChild(tr);continue;
        }
        ok++;cell(tr,(r.yen>=0?'+':'')+num(r.yen,0)+'円',r.yen>=0?'plus':'minus');
        cell(tr,(r.profit_medals>=0?'+':'')+num(r.profit_medals),r.profit_medals>=0?'plus':'minus');
        cell(tr,num(r.machine_return_pct)+'%');
        const hourly=r.duration_minutes>0?r.yen*60/r.duration_minutes:NaN;
        cell(tr,Number.isFinite(hourly)?(hourly>=0?'+':'')+num(hourly,0)+'円':'—',
          Number.isFinite(hourly)?(hourly>=0?'plus':'minus'):'muted');rows.appendChild(tr);
        tr=document.createElement('tr');
        for(const t of [num(r.g,0),num(r.I),num(r.R),num(r.normal_G),num(r.bonus_G),`${num(r.source_origins,0)} / ${num(r.source_stores,0)}`,num(r.mc_se_medals)])cell(tr,t);
        details.appendChild(tr);
      }
      status.textContent=`${ok}行表示 ｜96%補正モデル（仮定）`;
    }catch(error){if(id===requestId){status.textContent=error.message;rows.replaceChildren();details.replaceChildren()}}
  }
  $('history-form').addEventListener('submit',event=>{
    event.preventDefault();
    try{
      history=h.add(history,$('history-games').value,event.submitter?.dataset.kind||'BB');
      $('history-error').textContent='';$('history-games').value='';applyHistory();$('history-games').focus();
    }catch(error){$('history-error').textContent=error.message}
  });
  $('history-undo').addEventListener('click',()=>{history=h.undo(history);$('history-error').textContent='';applyHistory()});
  $('history-clear').addEventListener('click',()=>{history=h.clear();$('history-error').textContent='';applyHistory()});
  restore.addEventListener('click',applyHistory);
  C.addEventListener('input',()=>{manualTouched=true;restoreVisibility();render()});
  lend.addEventListener('input',()=>{exchangeMinimum(true);render()});
  exchange.addEventListener('input',()=>render());
  exchange.addEventListener('change',()=>{exchangeMinimum(true);render()});
  form.addEventListener('submit',render);
  exchangeMinimum(false);historyView();render();
})();
