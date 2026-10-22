(function(){
var C=window.QF||{},$=function(i){return document.getElementById(i)},LS=window.localStorage;
function ld(k,d){try{return JSON.parse(LS.getItem(k))||d}catch(e){return d}}
function sv(k,v){try{LS.setItem(k,JSON.stringify(v))}catch(e){}}
function dec(s){var t=document.createElement('textarea');t.innerHTML=s||'';return t.value}
function pad(n){return String(n).padStart(2,'0')}
function dur(s){var m=/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s||'');if(!m)return'';var h=+m[1]||0,mi=+m[2]||0,se=+m[3]||0;return h?h+':'+pad(mi)+':'+pad(se):mi+':'+pad(se)}
var chans=ld('qf.ch',null)||(C.CHANNELS||[]).map(function(h){return{h:h,m:false}});
var S=ld('qf.pl',null);if(!S||!S.video||!S.music)S={video:[{n:'Watch later',items:[]}],music:[{n:'Liked tracks',items:[]}]};
var V=[],Q=[],qi=0,f=-1,sk='video',op=null,pk=null,token=null,tc=null,yp=null,custom=false,started=false,tm=null;
function msg(t){$('msg').textContent=t;$('msg').hidden=!t}
function store(){sv('qf.pl',S)}
function saveCh(){sv('qf.ch',chans)}
function reload(){clearTimeout(tm);tm=setTimeout(loadFeed,600)}

async function api(p,q,auth){
  var h={};q=Object.assign({},q);
  if(auth)h.Authorization='Bearer '+token;
  else{if(!C.API_KEY)throw new Error('Add your API key to config.js first.');q.key=C.API_KEY}
  var r=await fetch('https://www.googleapis.com/youtube/v3/'+p+'?'+new URLSearchParams(q),{headers:h}),j=await r.json();
  if(!r.ok)throw new Error((j.error&&j.error.message)||'Request failed');
  return j;
}
async function resolve(h){
  var j=await api('channels',{part:'snippet,contentDetails',forHandle:'@'+h.replace(/^@/,'')}),c=j.items&&j.items[0];
  if(!c)throw new Error('Could not find '+h);
  return{h:h,id:c.id,n:c.snippet.title,u:c.contentDetails.relatedPlaylists.uploads};
}
function parseH(s){var m=s.match(/@([A-Za-z0-9._-]+)/);if(m)return m[1];return s.trim().replace(/^https?:\/\/(www\.)?youtube\.com\//,'').split(/[\/?#]/)[0]}

/* saving */
var BM='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" fill="FILL" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
function has(k,id){return S[k].some(function(p){return p.items.some(function(x){return x.id===id})})}
function mark(b,k,id){var on=has(k,id);b.innerHTML=BM.replace('FILL',on?'currentColor':'none');b.setAttribute('aria-label',on?'Saved. Change playlists':'Save to playlist');b.setAttribute('aria-pressed',String(on))}
function slim(v){return{id:v.id,t:v.t,c:v.c,th:v.th,d:v.d}}
function askSave(k,item,done){pk={k:k,item:item,done:done};pick();$('pick').hidden=false}
function pick(){
  var el=$('pl');el.innerHTML='';
  S[pk.k].forEach(function(p){
    var on=p.items.some(function(x){return x.id===pk.item.id}),b=document.createElement('button');
    b.className='fold';b.innerHTML='<span></span><span>'+(on?'Saved':'Add')+'</span>';b.children[0].textContent=p.n;b.setAttribute('aria-pressed',String(on));
    b.onclick=function(){p.items=on?p.items.filter(function(x){return x.id!==pk.item.id}):p.items.concat([slim(pk.item)]);store();pick()};
    el.appendChild(b);
  });
}
$('pa').onclick=function(){var i=$('pn'),n=i.value.trim();if(!n)return;S[pk.k].push({n:n,items:[slim(pk.item)]});i.value='';store();pick()};
$('pd').onclick=function(){$('pick').hidden=true;if(pk&&pk.done)pk.done();pk=null;if(!$('saved').hidden)savedView()};

/* feed */
function card(v,fn){
  var b=document.createElement('div');b.className='card';
  b.innerHTML='<button class="open"><b></b><i></i><img class="px" alt="" loading="lazy"></button>';
  b.querySelector('b').textContent=v.t;b.querySelector('i').textContent=v.c+(v.d?', '+v.d:'');b.querySelector('img').src=v.th;
  b.querySelector('.open').onclick=fn;return b;
}
function list(){var el=$('list');el.innerHTML='';V.filter(function(v){return f<0||v.ci===f}).forEach(function(v){el.appendChild(card(v,function(){openVid(v)}))})}
function chips(){
  var el=$('chips');el.innerHTML='';
  ['All'].concat(chans.map(function(c){return c.n||c.h}),['+']).forEach(function(n,i,a){
    var b=document.createElement('button'),add=i===a.length-1;b.textContent=n;
    if(add)b.setAttribute('aria-label','Add channel');
    b.setAttribute('aria-pressed',String(!add&&f===i-1));
    b.onclick=function(){if(add){$('addch').hidden=!$('addch').hidden;return}f=i-1;chips();list()};
    el.appendChild(b);
  });
}
function chl(){
  var el=$('cl');el.innerHTML='';
  chans.forEach(function(c,i){
    var r=document.createElement('div');r.className='row r3';
    r.innerHTML='<div class="go"></div><button class="rm">Music</button><button class="rm">Remove</button>';
    r.firstChild.textContent=c.n||c.h;
    var m=r.children[1];m.setAttribute('aria-pressed',String(!!c.m));
    m.onclick=function(){c.m=!c.m;saveCh();chl();custom=false;musicQ()};
    r.lastChild.onclick=function(){chans.splice(i,1);f=-1;V=[];saveCh();chips();list();chl();reload()};
    el.appendChild(r);
  });
}
async function loadFeed(){
  if(!C.API_KEY){msg('Add your API key to config.js to load videos.');return}
  if(!chans.length){V=[];list();musicQ();msg('No channels yet. Tap + to add one.');return}
  msg('Loading…');
  var all=[],bad=[];
  try{
    await Promise.all(chans.map(async function(c,i){
      try{
        if(!c.u)Object.assign(c,await resolve(c.h));
        var j=await api('playlistItems',{part:'snippet',playlistId:c.u,maxResults:8});
        j.items.forEach(function(x){
          var s=x.snippet,t=s.thumbnails||{},th=(t.medium||t.high||t.default||{}).url;
          if(th)all.push({id:s.resourceId.videoId,t:s.title,c:c.n,ci:i,th:th,at:s.publishedAt});
        });
      }catch(e){bad.push(c.h)}
    }));
    all.sort(function(a,b){return a.at<b.at?1:-1});
    for(var k=0;k<all.length;k+=50){
      var part=all.slice(k,k+50),j=await api('videos',{part:'contentDetails',id:part.map(function(x){return x.id}).join(',')}),m={};
      j.items.forEach(function(x){m[x.id]=dur(x.contentDetails.duration)});
      part.forEach(function(x){x.d=m[x.id]});
    }
    V=all;saveCh();chips();list();chl();musicQ();
    msg(bad.length?'Could not load: '+bad.join(', '):'');
  }catch(e){msg(e.message)}
}

/* video sheet */
function openVid(v){
  $('pf').innerHTML='<iframe src="https://www.youtube.com/embed/'+encodeURIComponent(v.id)+'?playsinline=1&rel=0&autoplay=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video player"></iframe>';
  $('st').textContent=v.t;$('sc').textContent=v.c;
  var sb=$('ssv'),sf=$('sf');
  mark(sb,'video',v.id);sb.onclick=function(){askSave('video',v,function(){mark(sb,'video',v.id)})};
  sf.disabled=false;sf.textContent='Add channel to feed';
  sf.hidden=!(v.cid&&!chans.some(function(c){return c.id===v.cid}));
  sf.onclick=function(){chans.push({h:v.c,id:v.cid,n:v.c,u:'UU'+v.cid.slice(2),m:false});saveCh();chips();chl();reload();sf.textContent='Added';sf.disabled=true};
  $('sheet').hidden=false;
}
$('close').onclick=function(){$('pf').innerHTML='';$('sheet').hidden=true};

/* add channel, search */
$('ca').onclick=async function(){
  var i=$('cn'),h=parseH(i.value);if(!h)return;
  try{
    var r=await resolve(h);
    if(chans.some(function(c){return c.id===r.id}))return;
    r.m=false;chans.push(r);i.value='';saveCh();chips();chl();reload();
  }catch(e){msg(e.message)}
};
$('cn').onkeydown=function(e){if(e.key==='Enter')$('ca').onclick()};
function clearSearch(){$('res').hidden=true;$('list').hidden=false;$('chips').hidden=false;$('q').value='';msg('')}
async function doSearch(){
  var q=$('q').value.trim();if(!q)return;msg('Searching…');
  try{
    var j=await api('search',{part:'snippet',type:'video',maxResults:15,q:q}),
    res=j.items.map(function(x){var s=x.snippet;return{id:x.id.videoId,t:dec(s.title),c:dec(s.channelTitle),cid:s.channelId,th:(s.thumbnails.medium||s.thumbnails.default).url}});
    if(res.length){
      var d=await api('videos',{part:'contentDetails',id:res.map(function(x){return x.id}).join(',')}),m={};
      d.items.forEach(function(x){m[x.id]=dur(x.contentDetails.duration)});
      res.forEach(function(x){x.d=m[x.id]});
    }
    var el=$('res'),hd=document.createElement('div'),w=document.createElement('div');el.innerHTML='';
    hd.className='hd';hd.innerHTML='<h2></h2><button>Clear</button>';hd.children[0].textContent='Results for '+q;hd.children[1].onclick=clearSearch;
    w.className='list';res.forEach(function(v){w.appendChild(card(v,function(){openVid(v)}))});
    el.appendChild(hd);el.appendChild(w);el.hidden=false;
    ['list','chips','addch','msg'].forEach(function(i){$(i).hidden=true});
  }catch(e){msg(e.message)}
}
$('qb').onclick=doSearch;
$('q').onkeydown=function(e){if(e.key==='Enter')doSearch()};

/* music */
function musicQ(){if(!custom)Q=V.filter(function(v){var c=chans[v.ci];return c&&c.m});trkList()}
function trkList(){
  var el=$('trk');el.innerHTML='';
  if(custom){var b0=document.createElement('button');b0.textContent='Show channel queue';b0.onclick=function(){custom=false;musicQ()};el.appendChild(b0)}
  if(!Q.length){el.insertAdjacentHTML('beforeend','<p class="empty">Tap Music next to a channel in the + panel on the Feed tab, and its latest uploads will queue here.</p>');return}
  Q.forEach(function(v,i){
    var b=document.createElement('button');
    b.innerHTML='<span>'+(i+1)+'</span><span></span><small>'+(v.d||'')+'</small>';b.children[1].textContent=v.t;
    if(started&&i===qi)b.setAttribute('aria-current','true');
    b.onclick=function(){playQ(i)};el.appendChild(b);
  });
}
function now(){var v=Q[qi];if(!v)return;$('nt').textContent=v.t;$('na').textContent=v.c;mark($('msv'),'music',v.id);trkList()}
function mk(id){yp=new YT.Player('yt',{videoId:id,playerVars:{playsinline:1,rel:0},events:{onStateChange:function(e){if(e.data===0&&Q.length)playQ((qi+1)%Q.length)}}})}
function initYT(id){
  if(window.YT&&YT.Player)return mk(id);
  window.onYouTubeIframeAPIReady=function(){mk(id)};
  if(!$('yta')){var s=document.createElement('script');s.id='yta';s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s)}
}
function playQ(i){
  if(!Q[i])return;qi=i;started=true;$('mp').hidden=false;now();
  if(yp&&yp.loadVideoById)yp.loadVideoById(Q[i].id);else initYT(Q[i].id);
}
$('next').onclick=function(){if(Q.length)playQ((qi+1)%Q.length)};
$('prev').onclick=function(){if(Q.length)playQ((qi+Q.length-1)%Q.length)};
$('msv').onclick=function(){var v=Q[qi];if(v)askSave('music',v,function(){mark($('msv'),'music',v.id)})};

/* saved */
function savedView(){
  var el=$('sbody'),L=S[sk];el.innerHTML='';
  $('sv1').setAttribute('aria-pressed',String(sk==='video'));$('sv2').setAttribute('aria-pressed',String(sk==='music'));
  if(op!==null&&L[op]){
    var p=L[op],hd=document.createElement('div'),armed=false;hd.className='hd';
    hd.innerHTML='<button>Back</button><h2></h2><button>Delete</button>';hd.children[1].textContent=p.n;
    hd.children[0].onclick=function(){op=null;savedView()};
    var del=hd.children[2];
    del.onclick=function(){if(!armed){armed=true;del.textContent='Tap again';return}L.splice(op,1);op=null;store();savedView()};
    el.appendChild(hd);
    if(!p.items.length)el.insertAdjacentHTML('beforeend','<p class="empty">Nothing saved here yet. Open a video or track and tap the bookmark.</p>');
    p.items.forEach(function(x,i){
      var r=document.createElement('div');r.className='row';
      r.innerHTML='<button class="go"><b></b><br><small></small></button><button class="rm">Remove</button>';
      r.querySelector('b').textContent=x.t;r.querySelector('small').textContent=x.c;
      r.querySelector('.go').onclick=function(){if(sk==='video')openVid(x);else{Q=p.items;custom=true;tab(2);playQ(i)}};
      r.querySelector('.rm').onclick=function(){p.items=p.items.filter(function(y){return y.id!==x.id});store();savedView()};
      el.appendChild(r);
    });
    return;
  }
  L.forEach(function(p,i){
    var b=document.createElement('button');b.className='fold';
    b.innerHTML='<span></span><span>'+p.items.length+'</span>';b.children[0].textContent=p.n;
    b.onclick=function(){op=i;savedView()};el.appendChild(b);
  });
  var a=document.createElement('div');a.className='add';
  a.innerHTML='<input placeholder="New playlist name" maxlength="40" aria-label="New playlist name"><button>Create</button>';
  a.lastChild.onclick=function(){var n=a.firstChild.value.trim();if(!n)return;L.push({n:n,items:[]});store();savedView()};
  el.appendChild(a);
}
$('sv1').onclick=function(){sk='video';op=null;savedView()};
$('sv2').onclick=function(){sk='music';op=null;savedView()};
function tab(n){
  ['feed','music','saved'].forEach(function(s,i){$(s).hidden=n!==i+1;$('t'+(i+1)).setAttribute('aria-selected',String(n===i+1))});
  if(n===3)savedView();window.scrollTo(0,0);
}
$('t1').onclick=function(){tab(1)};$('t2').onclick=function(){tab(2)};$('t3').onclick=function(){tab(3)};

/* Google sign-in and subscription import */
function loadGsi(){if(!C.CLIENT_ID||$('gsi'))return;var s=document.createElement('script');s.id='gsi';s.src='https://accounts.google.com/gsi/client';document.head.appendChild(s)}
function signin(cb){
  if(!C.CLIENT_ID){msg('Add your CLIENT_ID to config.js to turn on sign-in.');return}
  if(!(window.google&&google.accounts&&google.accounts.oauth2)){msg('Sign-in is still loading. Try again in a moment.');return}
  tc=tc||google.accounts.oauth2.initTokenClient({client_id:C.CLIENT_ID,scope:'https://www.googleapis.com/auth/youtube.readonly',callback:function(r){
    if(r.access_token){token=r.access_token;$('gs').hidden=false;$('gi').textContent='Switch account';if(cb)cb()}
    else if(r.error)msg('Sign-in failed: '+r.error);
  }});
  tc.requestAccessToken({prompt:'select_account'});
}
async function subs(){
  try{
    var out=[],pt='';
    for(var p=0;p<4;p++){
      var q={part:'snippet',mine:'true',maxResults:50};if(pt)q.pageToken=pt;
      var j=await api('subscriptions',q,true);out=out.concat(j.items);pt=j.nextPageToken;if(!pt)break;
    }
    var el=$('sl');el.innerHTML='<p class="empty">Tap Add on the channels you want in your feed.</p>';
    out.forEach(function(x){
      var s=x.snippet,id=s.resourceId.channelId;if(chans.some(function(c){return c.id===id}))return;
      var r=document.createElement('div');r.className='row';r.innerHTML='<div class="go"></div><button class="rm">Add</button>';
      r.firstChild.textContent=s.title;
      r.lastChild.onclick=function(){chans.push({h:s.title,id:id,n:s.title,u:'UU'+id.slice(2),m:false});r.remove();saveCh();chips();chl();reload()};
      el.appendChild(r);
    });
  }catch(e){msg(e.message)}
}
$('gi').onclick=function(){signin()};
$('gs').onclick=subs;
$('wi').onclick=function(){sv('qf.seen',1);$('welcome').hidden=true;signin(function(){tab(1);$('addch').hidden=false;subs()})};
$('ws').onclick=function(){sv('qf.seen',1);$('welcome').hidden=true};

function clock(){var d=new Date();$('clock').textContent=pad(d.getHours())+':'+pad(d.getMinutes())}
clock();setInterval(clock,20000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(function(){});
loadGsi();
if(!ld('qf.seen',0))$('welcome').hidden=false;
chips();chl();list();trkList();loadFeed();
})();
