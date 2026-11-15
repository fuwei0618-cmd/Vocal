/* 唱歌心態（11-15，她的 KTV 發現）：願景頁一個區塊，情境頁／學歌地圖開練前一鍵打開。base＝到 repo 根目錄的相對路徑 */
(function(){
const ROWS=[['注意力','在音樂上','在音樂和朋友上'],['身體','自然揮舞','自由移動：站沙發、穿梭、窩角落'],['聲音','不出聲，心裡跟著','出聲，被音樂包住'],['評價','沒有','沒有'],['關係','我和音樂','我、音樂和大家']];
const EL=[['心理面・安全','被允許、沒有評審'],['關係面・融入','我不是主角、大家一起'],['時間面・玩','目的是好玩、只有當下'],['外在開關','包廂包住我、迴音和原唱包住我的聲音']];
const css=`.mset{font-size:14px;line-height:1.55}.mset img{width:100%;border-radius:12px;display:block}
.mset .msay{font-size:1.15em;font-weight:700;margin:10px 0 2px}.mset .msub{opacity:.75;font-size:.92em;margin:0 0 10px}
.mset h4{margin:12px 0 4px;font-size:.95em}.mset table{width:100%;border-collapse:collapse;font-size:.92em}.mset th,.mset td{text-align:left;padding:4px 6px;border-bottom:1px solid rgba(128,128,128,.25);vertical-align:top}
.mset th{font-weight:600;opacity:.8}.mset .mel{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px}.mset .mel div{border:1px solid rgba(128,128,128,.3);border-radius:10px;padding:6px 10px}.mset .mel b{display:block;font-size:.9em}
.mset .mcore{border-left:3px solid #f2a541;padding:4px 10px;margin:4px 0}
#mindov{position:fixed;inset:0;z-index:9999;background:rgba(10,8,6,.86);overflow:auto;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top,0px) + 14px) 16px 24px}
#mindov .mbox{max-width:900px;margin:0 auto;background:#1b1612;color:#f6efe4;border-radius:16px;padding:14px 16px 18px;position:relative}
#mindov .mx{position:absolute;right:10px;top:10px;z-index:2;background:rgba(0,0,0,.55);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:99px;padding:6px 14px;font:inherit;font-size:14px;cursor:pointer}
@media (min-width:820px){.mset .mtop{display:grid;grid-template-columns:1.25fr 1fr;gap:14px;align-items:start}.mset .msay{margin-top:0}}
#mindov .mbox{padding-top:54px}`;
function ensureCss(){if(document.getElementById('mindcss'))return;const s=document.createElement('style');s.id='mindcss';s.textContent=css;document.head.appendChild(s)}
window.mindHtml=function(base){ensureCss();return `<div class="mset"><div class="mtop"><img src="${base}play.jpg?v=1" alt="小孩在遊戲場：溜滑梯上唱歌、追跑、窩在小屋裡">
<div><p class="msay">這裡很安全，我只是跟著音樂一起玩。</p><p class="msub">聽歌是身體跟著音樂走，唱歌是聲音跟著音樂走；前提都是不盯著自己。</p>
<div class="mcore">共同核心：注意力朝外（音樂、朋友），不是朝內盯著「唱得好不好」。</div></div></div>
<h4>兩種狀態</h4><table><thead><tr><th></th><th>聽歌時</th><th>唱歌時（KTV）</th></tr></thead><tbody>${ROWS.map(r=>`<tr><th>${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>
<h4>KTV 心態的元素</h4><div class="mel">${EL.map(e=>`<div><b>${e[0]}</b>${e[1]}</div>`).join('')}</div>
<p class="msub" style="margin-top:8px">外在開關幫我進入狀態；心理、關係、時間三面才是狀態本身。</p></div>`};
window.mindOpen=function(base){ensureCss();let o=document.getElementById('mindov');if(o)o.remove();o=document.createElement('div');o.id='mindov';
  o.innerHTML=`<div class="mbox"><button class="mx" type="button">好，開始玩 ✕</button>${mindHtml(base)}</div>`;
  o.addEventListener('click',e=>{if(e.target===o||e.target.closest('.mx'))o.remove()});document.body.appendChild(o)};
})();
