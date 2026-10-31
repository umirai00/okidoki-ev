/* Pure browser-local history calculations; no SQL, network or persistence. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  else root.OkidokiHistory=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  function games(value){
    if(typeof value==='string'){
      if(!/^\d+$/.test(value.trim()))throw Error('G数は0以上の整数で入力してください');
      value=Number(value.trim());
    }
    if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)throw Error('G数は0以上の整数で入力してください');
    return value;
  }
  function rebuild(entries){
    let C=0;
    const rows=entries.map((entry,i)=>{
      const g=games(entry.games);
      if(entry.kind!=='BB' && entry.kind!=='RB')throw Error('BBかRBを選択してください');
      C=C+g+(entry.kind==='BB'?69:29);
      if(!Number.isSafeInteger(C))throw Error('累計G数が大きすぎます');
      return {games:g,kind:entry.kind,C};
    });
    return {entries:rows,C};
  }
  function initialState(){return rebuild([])}
  function add(state,value,kind){return rebuild([...state.entries,{games:games(value),kind}])}
  function undo(state){return rebuild(state.entries.slice(0,-1))}
  function clear(){return initialState()}
  function rowView(state,index){
    const entry=state.entries[index],before=index?state.entries[index-1].C:0;
    return {ordinal:index+1,games:entry.games,kind:entry.kind,
      kindClass:entry.kind==='BB'?'bonus-bb':'bonus-rb',
      range:`${before.toLocaleString('ja-JP')}G→${entry.C.toLocaleString('ja-JP')}G`};
  }
  function needsRestore(state,value){
    if(value===null||value===undefined||typeof value==='boolean'||String(value).trim()==='')return true;
    const C=Number(value);
    return !Number.isSafeInteger(C)||C<0||C!==state.C;
  }
  function exchangeFloor(exchange,lend){
    const L=Number(lend),E=Number(exchange);
    if(!Number.isFinite(L)||L<=0)throw Error('貸出枚数は正数で入力してください');
    return Number.isFinite(E)&&E>=L?E:L;
  }
  function formatTime(minutes){
    if(!Number.isFinite(minutes)||minutes<0)return '—';
    const m=Math.max(minutes>0?1:0,Math.round(minutes));
    return m>=60?`${Math.floor(m/60)}時間${m%60}分`:`${m}分`;
  }
  return {initialState,add,undo,clear,rowView,needsRestore,exchangeFloor,formatTime};
});
